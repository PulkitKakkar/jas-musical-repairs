import type { HireStatus } from "@/lib/types";

const styles: Record<HireStatus, string> = {
  HIRED: "bg-orange-50 text-orange-700 ring-orange-200",
  RETURNED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function HireStatusBadge({ status }: { status: HireStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${styles[status]}`}>
      {status === "HIRED" ? "Hired" : "Returned"}
    </span>
  );
}
