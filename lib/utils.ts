import { clsx, type ClassValue } from "clsx";
import { differenceInCalendarDays, format } from "date-fns";

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

export function formatDuration(days: number | null) {
  if (days === null) return "—";
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function normalizeUkPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Phone number is required");

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0044")) digits = digits.slice(4);
  else if (digits.startsWith("44")) digits = digits.slice(2);
  else if (trimmed.startsWith("+") || digits.startsWith("00")) {
    throw new Error("Enter a UK phone number");
  }
  else if (digits.startsWith("0")) digits = digits.slice(1);

  if (!/^\d{9,10}$/.test(digits)) {
    throw new Error("Enter a valid UK phone number");
  }
  return `+44${digits}`;
}

export function tryNormalizeUkPhone(value: string) {
  try {
    return normalizeUkPhone(value);
  } catch {
    return null;
  }
}

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}
