"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { returnHireAction, revertHireAction } from "@/app/actions";
import { LoadingOverlay } from "@/components/loading-overlay";
import type { HirePaymentMethod } from "@/lib/types";
import { calculateHireAmounts, formatMoney, todayInputValue } from "@/lib/utils";

export function HireReturnAction({
  hireId,
  customerName,
  instrument,
  hireCost,
  securityDeposit,
  paymentMethod,
  initialExtraCharge,
}: {
  hireId: string;
  customerName: string;
  instrument: string;
  hireCost: number;
  securityDeposit: number;
  paymentMethod: HirePaymentMethod;
  initialExtraCharge: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [returnedDate, setReturnedDate] = useState(todayInputValue());
  const [extraCharge, setExtraCharge] = useState(String(initialExtraCharge));
  const router = useRouter();

  const amounts = useMemo(() => calculateHireAmounts({
    hireCost,
    securityDeposit,
    paymentMethod,
    extraCharge: Number(extraCharge) || 0,
  }), [extraCharge, hireCost, paymentMethod, securityDeposit]);

  async function submit(formData: FormData) {
    setPending(true);
    const result = await returnHireAction(hireId, formData);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Hire marked as returned");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      {pending && <LoadingOverlay />}
      <button className="btn-primary whitespace-nowrap px-3 py-2 text-xs" onClick={() => setOpen(true)} type="button">Mark Returned</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <form action={submit} className="w-full max-w-lg border-t-4 border-brand-600 bg-white p-6 shadow-2xl">
            <p className="eyebrow">Confirm hire return</p>
            <h2 className="mt-2 text-3xl font-normal">Mark returned?</h2>
            <div className="my-5 grid gap-3 bg-cream p-4 text-sm sm:grid-cols-2">
              <Summary label="Customer" value={customerName} />
              <Summary label="Instrument" value={instrument} />
              <Summary label="Payment" value={paymentMethod === "CARD" ? "Card" : "Cash"} />
              <Summary label="Security deposit" value={formatMoney(securityDeposit)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Returned date</label><input className="input" name="returnedDate" type="date" value={returnedDate} onChange={(event) => setReturnedDate(event.target.value)} required /></div>
              <div><label className="label">Extra charge (£)</label><input className="input" name="extraCharge" type="number" min="0" step="0.01" value={extraCharge} onChange={(event) => setExtraCharge(event.target.value)} /></div>
            </div>
            <div className="mt-5 grid gap-3 bg-cream p-4 text-sm sm:grid-cols-2">
              <Summary label="Hire total incl. VAT" value={formatMoney(amounts.hireTotal)} />
              <Summary label="Card fee" value={formatMoney(amounts.cardProcessingFee)} />
              <Summary label="Extra charge" value={formatMoney(Number(extraCharge) || 0)} />
              <Summary label="Return amount" value={formatMoney(amounts.returnAmount)} />
            </div>
            <p className="mt-3 text-xs text-ink/50">This updates the hire as returned. No customer SMS is sent for this action.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" disabled={pending} onClick={() => setOpen(false)} type="button">Cancel</button>
              <button className="btn-primary" disabled={pending || !returnedDate} type="submit">{pending ? "Updating…" : "Confirm returned"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function HireRevertAction({
  hireId,
  customerName,
  instrument,
}: {
  hireId: string;
  customerName: string;
  instrument: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function revert() {
    setPending(true);
    const result = await revertHireAction(hireId);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Hire reverted to hired");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      {pending && <LoadingOverlay />}
      <button className="btn-secondary whitespace-nowrap px-3 py-2 text-xs" onClick={() => setOpen(true)} type="button">Revert to Hired</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg border-t-4 border-orange-500 bg-white p-6 shadow-2xl">
            <p className="eyebrow">Confirm hire rollback</p>
            <h2 className="mt-2 text-3xl font-normal">Revert to hired?</h2>
            <div className="my-5 grid gap-3 bg-cream p-4 text-sm sm:grid-cols-2">
              <Summary label="Customer" value={customerName} />
              <Summary label="Instrument" value={instrument} />
              <Summary label="Current status" value="Returned" />
              <Summary label="New status" value="Hired" />
            </div>
            <p className="border-l-4 border-orange-500 bg-orange-50 p-3 text-sm font-bold text-orange-900">
              This removes the returned date and puts the hire back into active hired status. No SMS is sent.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" disabled={pending} onClick={() => setOpen(false)} type="button">Cancel</button>
              <button className="btn-primary" disabled={pending} onClick={revert} type="button">{pending ? "Updating…" : "Confirm Revert"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}
