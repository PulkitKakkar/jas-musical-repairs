import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectionReminderMessage, sendSms } from "@/lib/twilio";

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
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const repair of (data ?? []) as ReminderRepair[]) {
    const customer = Array.isArray(repair.customers) ? repair.customers[0] : repair.customers;
    if (!customer?.phone_number || !repair.completed_date) {
      results.push({ repairId: repair.id, sent: false, error: "Missing customer phone or completed date" });
      continue;
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
      results.push({ repairId: repair.id, repairNumber: repair.repair_number, sent: true });
    } catch (sendError) {
      results.push({
        repairId: repair.id,
        repairNumber: repair.repair_number,
        sent: false,
        error: sendError instanceof Error ? sendError.message : "Reminder failed",
      });
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    eligible: data?.length ?? 0,
    sent: results.filter((result) => result.sent).length,
    results,
  });
}
