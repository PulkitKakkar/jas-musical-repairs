import { clsx, type ClassValue } from "clsx";
import { differenceInCalendarDays, format } from "date-fns";
import type { HirePaymentMethod } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(value: number | string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value));
}

export function formatDate(value?: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy") : "—";
}

export function todayInputValue() {
  return format(new Date(), "yyyy-MM-dd");
}

export function durationDays(from?: string | null, to?: string | null) {
  if (!from) return null;
  return Math.max(0, differenceInCalendarDays(to ? new Date(to) : new Date(), new Date(from)));
}

export function inclusiveDurationDays(from?: string | null, to?: string | null) {
  const days = durationDays(from, to);
  return days === null ? null : Math.max(1, days + 1);
}

export function formatDuration(days: number | null) {
  if (days === null) return "—";
  return `${days} day${days === 1 ? "" : "s"}`;
}

export const countryCodeOptions = [
  { code: "+44", label: "UK (+44)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+35", label: "International (+35)" },
  { code: "+31", label: "Netherlands (+31)" },
  { code: "+32", label: "Belgium (+32)" },
];

export function normalizePhone(value: string, countryCode = "+44") {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Phone number is required");

  const countryDigits = countryCode.replace(/\D/g, "") || "44";
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return validateE164(`+${digits}`);
  if (digits.startsWith("00")) return validateE164(`+${digits.slice(2)}`);
  if (digits.startsWith(countryDigits) && digits.length > countryDigits.length + 6) return validateE164(`+${digits}`);
  if (digits.startsWith("0")) digits = digits.slice(1);

  return validateE164(`+${countryDigits}${digits}`);
}

function validateE164(value: string) {
  if (!/^\+[1-9]\d{7,14}$/.test(value)) {
    throw new Error("Enter a valid phone number");
  }
  return value;
}

export function normalizeUkPhone(value: string) {
  return normalizePhone(value, "+44");
}

export function tryNormalizePhone(value: string, countryCode = "+44") {
  try {
    return normalizePhone(value, countryCode);
  } catch {
    return null;
  }
}

export const tryNormalizeUkPhone = tryNormalizePhone;

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function calculateHireAmounts({
  hireCost,
  securityDeposit,
  extraCharge,
  paymentMethod,
}: {
  hireCost: number;
  securityDeposit: number;
  extraCharge: number;
  paymentMethod: HirePaymentMethod;
}) {
  const hireVat = roundMoney(hireCost * 0.2);
  const hireTotal = roundMoney(hireCost + hireVat);
  const cardProcessingFee = paymentMethod === "CARD" ? roundMoney(securityDeposit * 0.015) : 0;
  const returnAmount = roundMoney(securityDeposit - cardProcessingFee - hireTotal - extraCharge);
  return { hireVat, hireTotal, cardProcessingFee, returnAmount };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
