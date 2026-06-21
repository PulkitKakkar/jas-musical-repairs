import twilio from "twilio";
import type { RepairStatus } from "@/lib/types";
import { normalizePhone } from "@/lib/utils";

const TERMS_URL = "https://tinyurl.com/yh89tmhb";

function notificationFooter() {
  const contactNumber = process.env.JAS_CONTACT_NUMBER || "07304085555";
  return `Terms and conditions: ${TERMS_URL}\n\nThis is an automated message. Please do not reply.\nFor any queries, call or whatsapp us on ${contactNumber}`;
}

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
  const footer = notificationFooter();

  if (status === "DONE") {
    return `JAS Musicals: Hi ${firstName}, your ${instrument} repair is complete and ready for collection.\n\nRepair reference: ${repairNumber}\n\n${footer}`;
  }
  if (status === "COLLECTED") {
    return `JAS Musicals: Hi ${firstName}, thank you for collecting your ${instrument}.\n\nWe appreciate your support.\n\n${footer}`;
  }
  if (status === "CANCELLED") {
    return `JAS Musicals: Hi ${firstName}, your ${instrument} repair has been cancelled as requested.\n\nRepair reference: ${repairNumber}\n\n${footer}`;
  }
  return `JAS Musicals: Hi ${firstName}, thank you for leaving your ${instrument} with us for repair.\n\nRepair reference: ${repairNumber}\nStatus: Received\n\n${footer}`;
}

export function collectionReminderMessage(customerName: string, instrument: string, deadlineText: string) {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  const shopName = process.env.SHOP_NAME || "JAS Musicals";
  const openingHours = process.env.OPENING_HOURS || "Monday to Saturday, 10am to 6pm";
  const contactNumber = process.env.JAS_CONTACT_NUMBER || "07304085555";

  return `${shopName}: Hi ${firstName}, your ${instrument} repair is complete and ready for collection.\n\n` +
    `Please collect the instrument by ${deadlineText}. After this date, storage charges will apply.\n\n` +
    `Opening hours: ${openingHours}\n\n` +
    `Terms and conditions: ${TERMS_URL}\n\n` +
    `This is an automated message. Please do not reply.\n` +
    `For any queries, call us on ${contactNumber}.`;
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
    to: normalizePhone(to),
    from: process.env.TWILIO_PHONE_NUMBER!,
    body,
  });
  return { skipped: false, sid: message.sid };
}
