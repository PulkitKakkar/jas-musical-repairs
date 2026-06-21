import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hireReturnReminderMessage, sendSms } from "@/lib/twilio";

type ReminderHire = {
  id: string;
  hire_number: string;
  instrument: string;
  hire_date: string;
  return_due_date: string;
  hire_total: number;
  late_return_daily_charge: number;
  security_deposit: number;
  customers: {
    full_name: string;
    phone_number: string;
  } | {
    full_name: string;
    phone_number: string;
  }[] | null;
};

export async function GET(request: Request) {
  return sendHireReturnReminders(request);
}

export async function POST(request: Request) {
  return sendHireReturnReminders(request);
}

async function sendHireReturnReminders(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("hires")
    .select("id, hire_number, instrument, hire_date, return_due_date, hire_total, late_return_daily_charge, security_deposit, customers(full_name, phone_number)")
    .eq("status", "HIRED")
    .is("returned_date", null)
    .is("return_reminder_sent_at", null)
    .gte("return_due_date", todayStart.toISOString())
    .lte("return_due_date", todayEnd.toISOString())
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const hire of (data ?? []) as ReminderHire[]) {
    const customer = Array.isArray(hire.customers) ? hire.customers[0] : hire.customers;
    if (!customer?.phone_number || !hire.return_due_date) {
      results.push({ hireId: hire.id, sent: false, error: "Missing customer phone or return due date" });
      continue;
    }

    try {
      await sendSms(
        customer.phone_number,
        hireReturnReminderMessage({
          customerName: customer.full_name,
          instrument: hire.instrument,
          hireDate: hire.hire_date,
          returnDueDate: hire.return_due_date,
          hireTotal: Number(hire.hire_total),
          lateReturnDailyCharge: Number(hire.late_return_daily_charge),
          securityDeposit: Number(hire.security_deposit),
        }),
      );
      const { error: updateError } = await supabase
        .from("hires")
        .update({ return_reminder_sent_at: new Date().toISOString() })
        .eq("id", hire.id);
      if (updateError) throw updateError;
      results.push({ hireId: hire.id, hireNumber: hire.hire_number, sent: true });
    } catch (sendError) {
      results.push({
        hireId: hire.id,
        hireNumber: hire.hire_number,
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
