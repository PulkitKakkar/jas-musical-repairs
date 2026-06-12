import type { RepairStatus } from "@/lib/types";
import { statusMessage } from "@/lib/twilio";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendStatusEmail({
  to,
  customerName,
  repairNumber,
  instrument,
  status,
}: {
  to: string;
  customerName: string;
  repairNumber: string;
  instrument: string;
  status: RepairStatus;
}) {
  if (!isEmailConfigured()) {
    console.warn("Email is not configured; email notification skipped.");
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: `${repairNumber}: ${instrument} repair ${status.toLowerCase()}`,
      text: statusMessage(status, customerName, repairNumber, instrument),
    }),
  });

  if (!response.ok) {
    throw new Error(`Email notification failed: ${await response.text()}`);
  }
  return { skipped: false };
}
