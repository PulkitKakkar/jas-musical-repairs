import type { RepairStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<RepairStatus, string> = {
  RECEIVED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  DONE: "bg-blue-50 text-blue-700 ring-blue-600/20",
  COLLECTED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function StatusBadge({ status }: { status: RepairStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset", styles[status])}>
      {status}
    </span>
  );
}
