"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePaymentStatusAction } from "@/app/actions";
import type { PaymentStatus } from "@/lib/types";

export function PaymentStatusSelect({
  repairId,
  initialStatus,
  initialPaymentAmount = 0,
  compact = false,
}: {
  repairId: string;
  initialStatus: PaymentStatus;
  initialPaymentAmount?: number;
  compact?: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [paymentAmount, setPaymentAmount] = useState(String(initialPaymentAmount));
  const [partialOpen, setPartialOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function update(nextStatus: PaymentStatus, amount?: number) {
    setStatus(nextStatus);
    setPending(true);
    const result = await updatePaymentStatusAction(repairId, nextStatus, amount);
    setPending(false);
    if (result?.error) {
      setStatus(initialStatus);
      toast.error(result.error);
      return;
    }
    toast.success("Payment status updated");
    setPartialOpen(false);
    router.refresh();
  }

  function chooseStatus(nextStatus: PaymentStatus) {
    if (nextStatus === "PARTIAL") {
      setStatus("PARTIAL");
      setPartialOpen(true);
      return;
    }
    void update(nextStatus);
  }

  return (
    <>
      <select
        aria-label="Payment status"
        className={compact ? "input min-w-28 py-2 text-xs" : "input"}
        disabled={pending}
        onChange={(event) => chooseStatus(event.target.value as PaymentStatus)}
        value={status}
      >
        <option value="UNPAID">Unpaid</option>
        <option value="PARTIAL">Partial</option>
        <option value="PAID">Paid</option>
      </select>
      {status === "PARTIAL" && Number(initialPaymentAmount) > 0 && !partialOpen && (
        <p className="mt-1 text-xs text-ink/45">Paid: £{Number(initialPaymentAmount).toFixed(2)}</p>
      )}
      {partialOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md border-t-4 border-brand-600 bg-white p-6 shadow-2xl">
            <p className="eyebrow">Partial payment</p>
            <h2 className="mt-2 text-3xl font-normal">Enter amount paid</h2>
            <div className="mt-5">
              <label className="label">Amount paid (£)</label>
              <input className="input" min="0" onChange={(event) => setPaymentAmount(event.target.value)} step="0.01" type="number" value={paymentAmount} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" disabled={pending} onClick={() => { setPartialOpen(false); setStatus(initialStatus); }} type="button">Cancel</button>
              <button className="btn-primary" disabled={pending || Number(paymentAmount) <= 0} onClick={() => update("PARTIAL", Number(paymentAmount))} type="button">{pending ? "Saving…" : "Save partial payment"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
