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
  instrument: string,
) {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  const contactNumber = process.env.JAS_CONTACT_NUMBER || "07304 085555";
  const footer = `This is an automated message. Please do not reply.\nFor any queries, call us on ${contactNumber}`;

  if (status === "DONE") {
    return `JAS Musicals: Hi ${firstName}, your ${instrument} repair is complete and ready for collection.\n\nRepair reference: ${repairNumber}\n\n${footer}`;
  }
  if (status === "COLLECTED") {
    return `JAS Musicals: Hi ${firstName}, thank you for collecting your ${instrument}.\n\nWe appreciate your support.\n\n${footer}`;
  }
  return `JAS Musicals: Hi ${firstName}, thank you for leaving your ${instrument} with us for repair.\n\nRepair reference: ${repairNumber}\nStatus: Received\n\n${footer}`;
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
