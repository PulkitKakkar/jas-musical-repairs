import twilio from "twilio";
import type { RepairStatus } from "@/lib/types";
import { normalizeUkPhone } from "@/lib/utils";

export function isTwilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER,
  );
}

export function statusMessage(
  status: RepairStatus,
  customerName: string,
  repairNumber: string,
) {
  if (status === "DONE") {
    return `Hi ${customerName},\n\nYour instrument repair is complete.\n\nRepair Number: ${repairNumber}\n\nStatus: DONE\n\nPlease contact JAS Musicals to arrange collection.`;
  }
  if (status === "COLLECTED") {
    return `Hi ${customerName},\n\nYour instrument has been collected.\n\nRepair Number: ${repairNumber}\n\nThank you for choosing JAS Musicals.`;
  }
  return `Hi ${customerName},\n\nYour instrument has been received by JAS Musicals.\n\nRepair Number: ${repairNumber}\n\nCurrent Status: RECEIVED\n\nThank you.`;
}

export async function sendSms(to: string, body: string) {
  if (!isTwilioConfigured()) {
    console.warn("Twilio is not configured; SMS skipped.");
    return { skipped: true };
  }
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  );
  const message = await client.messages.create({
    to: normalizeUkPhone(to),
    from: process.env.TWILIO_PHONE_NUMBER!,
    body,
  });
  return { skipped: false, sid: message.sid };
}
