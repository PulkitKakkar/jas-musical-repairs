"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, format } from "date-fns";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { collectionReminderMessage, hireCreatedMessage, sendSms, statusMessage } from "@/lib/twilio";
import { sendStatusEmail } from "@/lib/email";
import { normalizePhone, splitName } from "@/lib/utils";
import type { PaymentStatus, RepairStatus } from "@/lib/types";

const repairSchema = z.object({
  customerName: z.string().trim().min(2),
  phoneNumber: z.string().trim().min(7),
  phoneCountryCode: z.string().trim().default("+44"),
  email: z.string().trim().email().or(z.literal("")),
  instrument: z.string().trim().min(2),
  issueDescription: z.string().trim().min(3),
  amount: z.coerce.number().min(0),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).default("UNPAID"),
  alternatePhoneNumber: z.string().trim().optional(),
  alternatePhoneCountryCode: z.string().trim().default("+44"),
  receivedDate: z.string().date(),
  notes: z.string().trim().optional(),
});

const hireSchema = z.object({
  customerName: z.string().trim().min(2),
  phoneNumber: z.string().trim().min(7),
  phoneCountryCode: z.string().trim().default("+44"),
  email: z.string().trim().email().or(z.literal("")),
  instrument: z.string().trim().min(2),
  hireDate: z.string().date(),
  returnDueDate: z.string().date(),
  hireCost: z.coerce.number().min(0),
  lateReturnDailyCharge: z.coerce.number().min(0).default(0),
  securityDeposit: z.coerce.number().min(0),
  paymentMethod: z.enum(["CASH", "CARD"]).default("CASH"),
  extraCharge: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional(),
});

const returnHireSchema = z.object({
  returnedDate: z.string().date(),
  extraCharge: z.coerce.number().min(0).default(0),
});

function startOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export async function createRepairAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = repairSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid repair details" };
  }
  const values = parsed.data;
  let phoneNumber: string;
  let alternatePhoneNumber: string | null = null;
  try {
    phoneNumber = normalizePhone(values.phoneNumber, values.phoneCountryCode);
    alternatePhoneNumber = values.alternatePhoneNumber ? normalizePhone(values.alternatePhoneNumber, values.alternatePhoneCountryCode) : null;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid phone number" };
  }
  const receivedTimestamp = `${values.receivedDate}T12:00:00.000Z`;
  const today = new Date().toISOString().slice(0, 10);
  if (values.receivedDate > today) {
    return { error: "Intake date cannot be in the future" };
  }
  const { firstName, lastName } = splitName(values.customerName);

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  let customerId = existingCustomer?.id;
  if (customerId) {
    const { error } = await supabase
      .from("customers")
      .update({
        first_name: firstName,
        last_name: lastName,
        email: values.email || null,
      })
      .eq("id", customerId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        email: values.email || null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    customerId = data.id;
  }

  const repairPayload = {
    customer_id: customerId,
    instrument: values.instrument,
    issue_description: values.issueDescription,
    amount: values.amount,
    payment_status: values.paymentStatus,
    alternate_phone_number: alternatePhoneNumber,
    received_date: receivedTimestamp,
    notes: values.notes || null,
  };
  let { data: repair, error } = await supabase
    .from("repairs")
    .insert(repairPayload)
    .select("id, repair_number")
    .single();
  if (error && /payment_status|alternate_phone_number/i.test(error.message)) {
    const fallback = await supabase
      .from("repairs")
      .insert({
        customer_id: repairPayload.customer_id,
        instrument: repairPayload.instrument,
        issue_description: repairPayload.issue_description,
        amount: repairPayload.amount,
        received_date: repairPayload.received_date,
        notes: repairPayload.notes,
      })
      .select("id, repair_number")
      .single();
    repair = fallback.data;
    error = fallback.error;
  }

  if (error) return { error: error.message };
  if (!repair) return { error: "Repair was not created" };
  try {
    await sendSms(
      phoneNumber,
      statusMessage("RECEIVED", values.customerName, repair.repair_number, values.instrument),
    );
  } catch (smsError) {
    console.error("Receipt SMS failed", smsError);
  }
  if (values.email) {
    try {
      await sendStatusEmail({
        to: values.email,
        customerName: values.customerName,
        repairNumber: repair.repair_number,
        instrument: values.instrument,
        status: "RECEIVED",
      });
    } catch (emailError) {
      console.error("Receipt email failed", emailError);
    }
  }

  revalidatePath("/admin");
  redirect(`/admin/repairs/${repair.id}?created=1`);
}

export async function createHireAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = hireSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid hire details" };
  }
  const values = parsed.data;
  if (values.returnDueDate < values.hireDate) {
    return { error: "Return date cannot be before hire date" };
  }

  let phoneNumber: string;
  try {
    phoneNumber = normalizePhone(values.phoneNumber, values.phoneCountryCode);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid phone number" };
  }

  const { firstName, lastName } = splitName(values.customerName);
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  let customerId = existingCustomer?.id;
  if (customerId) {
    const { error } = await supabase
      .from("customers")
      .update({
        first_name: firstName,
        last_name: lastName,
        email: values.email || null,
      })
      .eq("id", customerId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        email: values.email || null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    customerId = data.id;
  }

  const { error } = await supabase
    .from("hires")
    .insert({
      customer_id: customerId,
      instrument: values.instrument,
      hire_date: `${values.hireDate}T12:00:00.000Z`,
      return_due_date: `${values.returnDueDate}T12:00:00.000Z`,
      hire_cost: values.hireCost,
      late_return_daily_charge: values.lateReturnDailyCharge,
      security_deposit: values.securityDeposit,
      payment_method: values.paymentMethod,
      extra_charge: values.extraCharge,
      notes: values.notes || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/hires");
  redirect("/admin/hires?created=1");
}

export async function updateHireAction(hireId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = hireSchema.omit({
    customerName: true,
    phoneNumber: true,
    phoneCountryCode: true,
    email: true,
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid hire details" };
  }
  const values = parsed.data;
  if (values.returnDueDate < values.hireDate) {
    return { error: "Return date cannot be before hire date" };
  }

  const { error } = await supabase
    .from("hires")
    .update({
      instrument: values.instrument,
      hire_date: `${values.hireDate}T12:00:00.000Z`,
      return_due_date: `${values.returnDueDate}T12:00:00.000Z`,
      hire_cost: values.hireCost,
      late_return_daily_charge: values.lateReturnDailyCharge,
      security_deposit: values.securityDeposit,
      payment_method: values.paymentMethod,
      extra_charge: values.extraCharge,
      notes: values.notes || null,
    })
    .eq("id", hireId);
  if (error) return { error: error.message };

  revalidatePath("/admin/hires");
  revalidatePath("/admin");
  return { success: true };
}

export async function sendHireSmsAction(hireId: string) {
  const { supabase } = await requireAdmin();
  const { data: hire, error } = await supabase
    .from("hires")
    .select("id, instrument, hire_date, return_due_date, hire_total, late_return_daily_charge, security_deposit, customers(full_name, phone_number)")
    .eq("id", hireId)
    .single();
  if (error) return { error: error.message };

  const customer = Array.isArray(hire.customers) ? hire.customers[0] : hire.customers;
  if (!customer?.phone_number) return { error: "Customer phone number is missing" };

  try {
    await sendSms(
      customer.phone_number,
      hireCreatedMessage({
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
      .update({ hire_sms_sent_at: new Date().toISOString() })
      .eq("id", hire.id);
    if (updateError) return { error: updateError.message };
  } catch (smsError) {
    return { error: smsError instanceof Error ? smsError.message : "Hire SMS failed" };
  }

  revalidatePath("/admin/hires");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateStatusAction(repairId: string, status: RepairStatus, eventDate: string) {
  const { supabase } = await requireAdmin();
  if (!["DONE", "COLLECTED", "CANCELLED"].includes(status)) return { error: "Invalid status" };
  const parsedDate = z.string().date().safeParse(eventDate);
  if (!parsedDate.success) return { error: "Select a valid status date" };
  const eventTimestamp = `${parsedDate.data}T12:00:00.000Z`;
  const today = new Date().toISOString().slice(0, 10);
  if (parsedDate.data > today) return { error: "Status date cannot be in the future" };

  const { data: repair, error: readError } = await supabase
    .from("repairs")
    .select("repair_number, instrument, status, received_date, completed_date, customers(full_name, phone_number, email)")
    .eq("id", repairId)
    .single();
  if (readError) return { error: readError.message };
  const allowedNextStatuses: Partial<Record<RepairStatus, RepairStatus[]>> = {
    RECEIVED: ["DONE", "CANCELLED"],
    DONE: ["COLLECTED", "CANCELLED"],
  };
  if (!allowedNextStatuses[repair.status as RepairStatus]?.includes(status)) {
    return { error: `A ${repair.status} repair cannot be marked as ${status}` };
  }
  if (parsedDate.data < repair.received_date.slice(0, 10)) {
    return { error: "Status date cannot be before the intake date" };
  }
  if (["COLLECTED", "CANCELLED"].includes(status) && repair.completed_date && parsedDate.data < repair.completed_date.slice(0, 10)) {
    return { error: `${status === "COLLECTED" ? "Collected" : "Cancellation"} date cannot be before the completed date` };
  }

  const updates =
    status === "DONE"
      ? { status, completed_date: eventTimestamp }
      : status === "COLLECTED"
        ? { status, collected_date: eventTimestamp }
        : { status, cancelled_date: eventTimestamp };
  const { error } = await supabase.from("repairs").update(updates).eq("id", repairId);
  if (error) return { error: error.message };

  const customer = Array.isArray(repair.customers)
    ? repair.customers[0]
    : repair.customers;
  try {
    await sendSms(
      customer.phone_number,
      statusMessage(status, customer.full_name, repair.repair_number, repair.instrument),
    );
  } catch (smsError) {
    console.error("Status SMS failed", smsError);
  }
  if (customer.email) {
    try {
      await sendStatusEmail({
        to: customer.email,
        customerName: customer.full_name,
        repairNumber: repair.repair_number,
        instrument: repair.instrument,
        status,
      });
    } catch (emailError) {
      console.error("Status email failed", emailError);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/repairs");
  revalidatePath(`/admin/repairs/${repairId}`);
  return { success: true };
}

export async function revertStatusAction(repairId: string, status: RepairStatus) {
  const { supabase } = await requireAdmin();
  const { data: repair, error: readError } = await supabase
    .from("repairs")
    .select("status")
    .eq("id", repairId)
    .single();
  if (readError) return { error: readError.message };

  const allowedPreviousStatus: Partial<Record<RepairStatus, RepairStatus>> = {
    COLLECTED: "DONE",
    DONE: "RECEIVED",
  };
  if (allowedPreviousStatus[repair.status as RepairStatus] !== status) {
    return { error: `A ${repair.status} repair cannot be reverted to ${status}` };
  }

  const updates =
    status === "DONE"
      ? { status, collected_date: null }
      : { status, completed_date: null, collected_date: null };
  const { error } = await supabase.from("repairs").update(updates).eq("id", repairId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/repairs");
  revalidatePath(`/admin/repairs/${repairId}`);
  return { success: true };
}

export async function updateNotesAction(repairId: string, notes: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("repairs").update({ notes }).eq("id", repairId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/repairs/${repairId}`);
  return { success: true };
}

export async function updatePaymentStatusAction(repairId: string, paymentStatus: PaymentStatus) {
  const { supabase } = await requireAdmin();
  if (!["UNPAID", "PARTIAL", "PAID"].includes(paymentStatus)) return { error: "Invalid payment status" };
  const { error } = await supabase
    .from("repairs")
    .update({ payment_status: paymentStatus })
    .eq("id", repairId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/repairs");
  revalidatePath(`/admin/repairs/${repairId}`);
  revalidatePath("/admin/reports");
  return { success: true };
}

export async function sendRepairCollectionReminderAction(repairId: string) {
  const { supabase } = await requireAdmin();
  const { data: repair, error } = await supabase
    .from("repairs")
    .select("id, repair_number, instrument, status, completed_date, collected_date, collection_reminder_sent_at, customers(full_name, phone_number)")
    .eq("id", repairId)
    .single();
  if (error) return { error: error.message };
  if (repair.status !== "DONE" || repair.collected_date) return { error: "Reminder can only be sent for uncollected DONE repairs" };
  if (!repair.completed_date) return { error: "Completed date is missing" };
  if (repair.collection_reminder_sent_at && repair.collection_reminder_sent_at >= startOfTodayIso()) {
    return { error: "A collection reminder has already been sent today" };
  }

  const customer = Array.isArray(repair.customers) ? repair.customers[0] : repair.customers;
  if (!customer?.phone_number) return { error: "Customer phone number is missing" };

  try {
    await sendSms(
      customer.phone_number,
      collectionReminderMessage(
        customer.full_name,
        repair.instrument,
        format(addDays(new Date(repair.completed_date), 15), "dd MMM yyyy"),
      ),
    );
    const { error: updateError } = await supabase
      .from("repairs")
      .update({ collection_reminder_sent_at: new Date().toISOString() })
      .eq("id", repair.id);
    if (updateError) return { error: updateError.message };
  } catch (smsError) {
    return { error: smsError instanceof Error ? smsError.message : "Reminder SMS failed" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/repairs");
  revalidatePath(`/admin/repairs/${repairId}`);
  return { success: true };
}

export async function returnHireAction(hireId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = returnHireSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid return details" };
  }
  const values = parsed.data;

  const { data: hire, error: readError } = await supabase
    .from("hires")
    .select("status, hire_date")
    .eq("id", hireId)
    .single();
  if (readError) return { error: readError.message };
  if (hire.status !== "HIRED") return { error: "This hire has already been returned" };
  if (values.returnedDate < hire.hire_date.slice(0, 10)) {
    return { error: "Returned date cannot be before hire date" };
  }

  const { error } = await supabase
    .from("hires")
    .update({
      status: "RETURNED",
      returned_date: `${values.returnedDate}T12:00:00.000Z`,
      extra_charge: values.extraCharge,
    })
    .eq("id", hireId);
  if (error) return { error: error.message };

  revalidatePath("/admin/hires");
  revalidatePath("/admin");
  return { success: true };
}

export async function revertHireAction(hireId: string) {
  const { supabase } = await requireAdmin();
  const { data: hire, error: readError } = await supabase
    .from("hires")
    .select("status")
    .eq("id", hireId)
    .single();
  if (readError) return { error: readError.message };
  if (hire.status !== "RETURNED") return { error: "Only returned hires can be reverted" };

  const { error } = await supabase
    .from("hires")
    .update({
      status: "HIRED",
      returned_date: null,
    })
    .eq("id", hireId);
  if (error) return { error: error.message };

  revalidatePath("/admin/hires");
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteRepairAction(repairId: string, repairNumberConfirmation: string) {
  const { supabase } = await requireAdmin();
  const { data: repair, error: readError } = await supabase
    .from("repairs")
    .select("repair_number")
    .eq("id", repairId)
    .single();
  if (readError) return { error: readError.message };
  if (repair.repair_number !== repairNumberConfirmation.trim()) {
    return { error: "Repair number confirmation does not match" };
  }

  const { error } = await supabase.from("repairs").delete().eq("id", repairId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/repairs");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/reports");
  return { success: true };
}

export async function loginAction(formData: FormData) {
  const { supabase } = await requireUnauthenticatedClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/admin");
}

export async function reportLoginAction(formData: FormData) {
  const { supabase } = await requireUnauthenticatedClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  await supabase.auth.signOut();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/reports-login?error=${encodeURIComponent(error.message)}`);

  const allowedEmails = (process.env.REPORT_MASTER_EMAILS ?? "")
    .split(",")
    .map((allowedEmail) => allowedEmail.trim().toLowerCase())
    .filter(Boolean);
  if (!data.user.email || !allowedEmails.includes(data.user.email.toLowerCase())) {
    await supabase.auth.signOut();
    redirect("/reports-login?error=This account is not allowed to view reports");
  }

  redirect("/admin/reports");
}

async function requireUnauthenticatedClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return { supabase: await createClient() };
}

export async function logoutAction() {
  const { supabase } = await requireAdmin();
  await supabase.auth.signOut();
  redirect("/login");
}
