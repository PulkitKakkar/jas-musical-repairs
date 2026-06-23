import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireReportsMaster() {
  const { supabase, user } = await requireAdmin();
  const allowedEmails = reportMasterEmails();
  const userEmail = user.email?.toLowerCase();

  if (!userEmail || !allowedEmails.includes(userEmail)) {
    redirect("/reports-login");
  }

  return { supabase, user };
}

export function reportMasterEmails() {
  return (process.env.REPORT_MASTER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
