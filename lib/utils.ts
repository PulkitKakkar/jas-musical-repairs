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

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}
