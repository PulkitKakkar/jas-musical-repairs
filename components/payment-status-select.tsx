"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePaymentStatusAction } from "@/app/actions";
import type { PaymentStatus } from "@/lib/types";

export function PaymentStatusSelect({
  repairId,
  initialStatus,
  compact = false,
}: {
  repairId: string;
  initialStatus: PaymentStatus;
  compact?: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function update(nextStatus: PaymentStatus) {
    setStatus(nextStatus);
    setPending(true);
    const result = await updatePaymentStatusAction(repairId, nextStatus);
    setPending(false);
    if (result?.error) {
      setStatus(initialStatus);
      toast.error(result.error);
      return;
    }
    toast.success("Payment status updated");
    router.refresh();
  }

  return (
    <select
      aria-label="Payment status"
      className={compact ? "input min-w-28 py-2 text-xs" : "input"}
      disabled={pending}
      onChange={(event) => update(event.target.value as PaymentStatus)}
      value={status}
    >
      <option value="UNPAID">Unpaid</option>
      <option value="PARTIAL">Partial</option>
      <option value="PAID">Paid</option>
    </select>
  );
}
