"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sendSms, statusMessage } from "@/lib/twilio";
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

async function requireUnauthenticatedClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return { supabase: await createClient() };
}

export async function logoutAction() {
  const { supabase } = await requireAdmin();
  await supabase.auth.signOut();
  redirect("/login");
}
