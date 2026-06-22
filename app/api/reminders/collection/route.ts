import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectionReminderMessage, sendSms } from "@/lib/twilio";

const MAX_REMINDERS_PER_RUN = 10;

type ReminderRepair = {
  id: string;
  repair_number: string;
  instrument: string;
  completed_date: string;
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
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15);

  const { data, error } = await supabase
    .from("repairs")
    .select("id, repair_number, instrument, completed_date, customers(full_name, phone_number)")
    .eq("status", "DONE")
    .is("collected_date", null)
    .is("collection_reminder_sent_at", null)
    .not("completed_date", "is", null)
    .lte("completed_date", cutoff.toISOString())
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await Promise.all(((data ?? []) as ReminderRepair[]).map(async (repair) => {
    const customer = Array.isArray(repair.customers) ? repair.customers[0] : repair.customers;
    if (!customer?.phone_number || !repair.completed_date) {
      return { repairId: repair.id, sent: false, error: "Missing customer phone or completed date" };
    }

    const deadlineText = format(addDays(new Date(repair.completed_date), 15), "dd MMM yyyy");
    try {
      await sendSms(
        customer.phone_number,
        collectionReminderMessage(customer.full_name, repair.instrument, deadlineText),
      );
      const { error: updateError } = await supabase
        .from("repairs")
        .update({ collection_reminder_sent_at: new Date().toISOString() })
        .eq("id", repair.id);
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
