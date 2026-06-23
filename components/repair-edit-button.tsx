"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateRepairDetailsAction } from "@/app/actions";
import { LoadingOverlay } from "@/components/loading-overlay";
import type { PaymentStatus, Repair } from "@/lib/types";
import { countryCodeOptions } from "@/lib/utils";

export function RepairEditButton({ repair }: { repair: Repair }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(repair.payment_status ?? "UNPAID");
  const [paymentAmount, setPaymentAmount] = useState(String(repair.payment_amount ?? 0));
  const router = useRouter();

  async function update(formData: FormData) {
    setPending(true);
    const result = await updateRepairDetailsAction(repair.id, formData);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Repair updated");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      {pending && <LoadingOverlay />}
      <button className="btn-secondary" onClick={() => setOpen(true)} type="button">Edit repair</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <form action={update} className="max-h-[90vh] w-full max-w-3xl overflow-auto border-t-4 border-brand-600 bg-white p-6 shadow-2xl">
            <p className="eyebrow">Amend repair</p>
            <h2 className="mt-2 text-3xl font-normal">{repair.repair_number}</h2>
            <p className="mt-1 text-sm text-ink/55">{repair.customers?.full_name} · {repair.customers?.phone_number}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><label className="label">Instrument</label><input className="input" name="instrument" defaultValue={repair.instrument} required /></div>
              <div><label className="label">Intake date</label><input className="input" name="receivedDate" type="date" defaultValue={repair.received_date.slice(0, 10)} required /></div>
              <div className="sm:col-span-2"><label className="label">Issue description</label><textarea className="input min-h-24" name="issueDescription" defaultValue={repair.issue_description} required /></div>
              <div><label className="label">Amount (£)</label><input className="input" name="amount" type="number" min="0" step="0.01" defaultValue={repair.amount} required /></div>
              <div><label className="label">Payment status</label><select className="input" name="paymentStatus" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}><option value="UNPAID">Unpaid</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option></select></div>
              {paymentStatus === "PARTIAL" && <div><label className="label">Amount paid (£)</label><input className="input" name="paymentAmount" type="number" min="0" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required /></div>}
              {paymentStatus !== "PARTIAL" && <input name="paymentAmount" type="hidden" value={paymentStatus === "PAID" ? repair.amount : 0} />}
              <div><label className="label">Alternate phone</label><div className="flex gap-2"><select className="input max-w-36" name="alternatePhoneCountryCode" defaultValue="+44">{countryCodeOptions.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select><input className="input" name="alternatePhoneNumber" type="tel" defaultValue={repair.alternate_phone_number ?? ""} /></div></div>
            </div>
            <p className="mt-4 text-xs text-ink/50">Editing repair data does not send any customer SMS.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" disabled={pending} onClick={() => setOpen(false)} type="button">Cancel</button>
              <button className="btn-primary" disabled={pending || (paymentStatus === "PARTIAL" && Number(paymentAmount) <= 0)} type="submit">{pending ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
