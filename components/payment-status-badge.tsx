import type { PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<PaymentStatus, string> = {
  UNPAID: "bg-red-50 text-red-700 ring-red-600/20",
  PARTIAL: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset", styles[status])}>
      {status}
    </span>
  );
}
