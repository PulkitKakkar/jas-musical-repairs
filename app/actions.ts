"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sendSms, statusMessage } from "@/lib/twilio";
import { splitName } from "@/lib/utils";
import type { RepairStatus } from "@/lib/types";

const repairSchema = z.object({
  customerName: z.string().trim().min(2),
  phoneNumber: z.string().trim().min(7),
  email: z.string().trim().email().or(z.literal("")),
  instrument: z.string().trim().min(2),
  issueDescription: z.string().trim().min(3),
  amount: z.coerce.number().min(0),
  notes: z.string().trim().optional(),
});

export async function createRepairAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = repairSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid repair details" };
  }
  const values = parsed.data;
  const { firstName, lastName } = splitName(values.customerName);

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone_number", values.phoneNumber)
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
        phone_number: values.phoneNumber,
        email: values.email || null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    customerId = data.id;
  }

  const { data: repair, error } = await supabase
    .from("repairs")
    .insert({
      customer_id: customerId,
      instrument: values.instrument,
      issue_description: values.issueDescription,
      amount: values.amount,
      notes: values.notes || null,
    })
    .select("id, repair_number")
    .single();

  if (error) return { error: error.message };
  try {
    await sendSms(
      values.phoneNumber,
      statusMessage("RECEIVED", values.customerName, repair.repair_number),
    );
  } catch (smsError) {
    console.error("Receipt SMS failed", smsError);
  }

  revalidatePath("/admin");
  redirect(`/admin/repairs/${repair.id}?created=1`);
}

export async function updateStatusAction(repairId: string, status: RepairStatus) {
  const { supabase } = await requireAdmin();
  if (!["DONE", "COLLECTED"].includes(status)) return { error: "Invalid status" };

  const { data: repair, error: readError } = await supabase
    .from("repairs")
    .select("repair_number, status, customers(full_name, phone_number)")
    .eq("id", repairId)
    .single();
  if (readError) return { error: readError.message };
  const allowedNextStatus: Partial<Record<RepairStatus, RepairStatus>> = {
    RECEIVED: "DONE",
    DONE: "COLLECTED",
  };
  if (allowedNextStatus[repair.status as RepairStatus] !== status) {
    return { error: `A ${repair.status} repair cannot be marked as ${status}` };
  }

  const updates =
    status === "DONE"
      ? { status, completed_date: new Date().toISOString() }
      : { status, collected_date: new Date().toISOString() };
  const { error } = await supabase.from("repairs").update(updates).eq("id", repairId);
  if (error) return { error: error.message };

  const customer = Array.isArray(repair.customers)
    ? repair.customers[0]
    : repair.customers;
  try {
    await sendSms(
      customer.phone_number,
      statusMessage(status, customer.full_name, repair.repair_number),
    );
  } catch (smsError) {
    console.error("Status SMS failed", smsError);
  }

  revalidatePath("/admin");
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
