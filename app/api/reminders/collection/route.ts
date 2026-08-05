import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectionReminderMessage, sendSms } from "@/lib/twilio";

const MAX_REMINDERS_PER_RUN = 10;
const REPAIR_REMINDER_START_DATE = "2026-06-23T00:00:00.000Z";

type ReminderRepair = {
  id: string;
  repair_number: string;
  instrument: string;
  status: string;
  completed_date: string;
  collected_date: string | null;
  collection_reminder_sent_at: string | null;
  collection_reminder_count: number;
  customers: {
    full_name: string;
    phone_number: string;
  } | {
    full_name: string;
    phone_number: string;
  }[] | null;
};

export async function GET(request: Request) {
  return sendCollectionReminders(request);
}

export async function POST(request: Request) {
  return sendCollectionReminders(request);
}

async function sendCollectionReminders(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = reminderLimit(request);
  const supabase = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const reminderCutoff = new Date();
  reminderCutoff.setDate(reminderCutoff.getDate() - 15);

  const { data, error } = await supabase
    .from("repairs")
    .select("id, repair_number, instrument, status, completed_date, collected_date, collection_reminder_sent_at, collection_reminder_count, customers(full_name, phone_number)")
    .eq("status", "DONE")
    .is("collected_date", null)
    .not("completed_date", "is", null)
    .gte("created_at", REPAIR_REMINDER_START_DATE)
    .lt("collection_reminder_count", 2)
    .or([
      `and(collection_reminder_count.eq.0,completed_date.lte.${reminderCutoff.toISOString()})`,
      `and(collection_reminder_count.eq.1,collection_reminder_sent_at.lte.${reminderCutoff.toISOString()})`,
    ].join(","))
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await Promise.all(((data ?? []) as ReminderRepair[]).map(async (repair) => {
    const { data: currentRepair, error: currentError } = await supabase
      .from("repairs")
      .select("id, repair_number, instrument, status, completed_date, collected_date, collection_reminder_sent_at, collection_reminder_count")
      .eq("id", repair.id)
      .single();
    if (currentError) {
      return {
        repairId: repair.id,
        repairNumber: repair.repair_number,
        sent: false,
        error: currentError.message,
      };
    }
    if (
      currentRepair.status !== "DONE" ||
      currentRepair.collected_date ||
      !currentRepair.completed_date
    ) {
      return {
        repairId: repair.id,
        repairNumber: repair.repair_number,
        sent: false,
        skipped: true,
        error: `Skipped because current status is ${currentRepair.status}`,
      };
    }
    if (currentRepair.collection_reminder_sent_at && currentRepair.collection_reminder_sent_at >= todayStart.toISOString()) {
      return {
        repairId: repair.id,
        repairNumber: repair.repair_number,
        sent: false,
        skipped: true,
        error: "A collection reminder has already been sent today",
      };
    }
    if (currentRepair.collection_reminder_count >= 2) {
      return {
        repairId: repair.id,
        repairNumber: repair.repair_number,
        sent: false,
        skipped: true,
        error: "Maximum collection reminders already sent",
      };
    }
    const nextReminderDueAt = currentRepair.collection_reminder_count === 0
      ? new Date(currentRepair.completed_date)
      : new Date(currentRepair.collection_reminder_sent_at ?? currentRepair.completed_date);
    nextReminderDueAt.setDate(nextReminderDueAt.getDate() + 15);
    if (nextReminderDueAt > new Date()) {
      return {
        repairId: repair.id,
        repairNumber: repair.repair_number,
        sent: false,
        skipped: true,
        error: `Next reminder is due ${nextReminderDueAt.toISOString()}`,
      };
    }

    const customer = Array.isArray(repair.customers) ? repair.customers[0] : repair.customers;
    if (!customer?.phone_number) {
      return { repairId: repair.id, sent: false, error: "Missing customer phone or completed date" };
    }

    const deadlineText = format(addDays(new Date(currentRepair.completed_date), 15), "dd MMM yyyy");
    try {
      await sendSms(
        customer.phone_number,
        collectionReminderMessage(customer.full_name, currentRepair.instrument, deadlineText, repair.repair_number),
      );
      const { error: updateError } = await supabase
        .from("repairs")
        .update({
          collection_reminder_sent_at: new Date().toISOString(),
          collection_reminder_count: currentRepair.collection_reminder_count + 1,
        })
        .eq("id", repair.id)
        .eq("status", "DONE")
        .is("collected_date", null)
        .lt("collection_reminder_count", 2);
      if (updateError) throw updateError;
      return { repairId: repair.id, repairNumber: repair.repair_number, sent: true };
    } catch (sendError) {
      return {
        repairId: repair.id,
        repairNumber: repair.repair_number,
        sent: false,
        error: sendError instanceof Error ? sendError.message : "Reminder failed",
      };
    }
  }));

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    reminderStartDate: REPAIR_REMINDER_START_DATE,
    limit,
    eligible: data?.length ?? 0,
    sent: results.filter((result) => result.sent).length,
    results,
  });
}

function reminderLimit(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("limit"));
  if (!Number.isFinite(requested) || requested <= 0) return MAX_REMINDERS_PER_RUN;
  return Math.min(Math.floor(requested), MAX_REMINDERS_PER_RUN);
}
