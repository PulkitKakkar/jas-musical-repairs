"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendHireSmsAction, updateHireAction } from "@/app/actions";
import { HireReturnAction, HireRevertAction } from "@/components/hire-return-action";
import { LoadingOverlay } from "@/components/loading-overlay";
import type { Hire, HirePaymentMethod } from "@/lib/types";
import { calculateHireAmounts, formatMoney } from "@/lib/utils";

export function HireAdminActions({ hire }: { hire: Hire }) {
  const [editOpen, setEditOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [hireCost, setHireCost] = useState(String(hire.hire_cost));
  const [securityDeposit, setSecurityDeposit] = useState(String(hire.security_deposit));
  const [extraCharge, setExtraCharge] = useState(String(hire.extra_charge));
  const [paymentMethod, setPaymentMethod] = useState<HirePaymentMethod>(hire.payment_method);
  const router = useRouter();

  const amounts = useMemo(() => calculateHireAmounts({
    hireCost: Number(hireCost) || 0,
    securityDeposit: Number(securityDeposit) || 0,
    extraCharge: Number(extraCharge) || 0,
    paymentMethod,
  }), [extraCharge, hireCost, paymentMethod, securityDeposit]);

  async function update(formData: FormData) {
    setPending(true);
    const result = await updateHireAction(hire.id, formData);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Hire updated");
      setEditOpen(false);
      router.refresh();
    }
  }

  async function sendSms() {
    setPending(true);
    const result = await sendHireSmsAction(hire.id);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Hire SMS sent");
      setSendOpen(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {pending && <LoadingOverlay />}
      <button className="btn-secondary whitespace-nowrap px-3 py-2 text-xs" onClick={() => setEditOpen(true)} type="button">Edit</button>
      <button className="btn-secondary whitespace-nowrap px-3 py-2 text-xs" onClick={() => setSendOpen(true)} type="button">{hire.hire_sms_sent_at ? "Resend SMS" : "Send SMS"}</button>
      {hire.status === "HIRED" ? (
        <HireReturnAction
          customerName={hire.customers?.full_name ?? "Unknown customer"}
          hireCost={Number(hire.hire_cost)}
          hireId={hire.id}
          initialExtraCharge={Number(hire.extra_charge)}
          instrument={hire.instrument}
          paymentMethod={hire.payment_method}
          securityDeposit={Number(hire.security_deposit)}
        />
      ) : (
        <HireRevertAction
          customerName={hire.customers?.full_name ?? "Unknown customer"}
          hireId={hire.id}
          instrument={hire.instrument}
        />
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <form action={update} className="max-h-[90vh] w-full max-w-3xl overflow-auto border-t-4 border-brand-600 bg-white p-6 shadow-2xl">
            <p className="eyebrow">Amend hire</p>
            <h2 className="mt-2 text-3xl font-normal">{hire.hire_number}</h2>
            <p className="mt-1 text-sm text-ink/55">{hire.customers?.full_name} · {hire.customers?.phone_number}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><label className="label">Instrument</label><input className="input" name="instrument" defaultValue={hire.instrument} required /></div>
              <div><label className="label">Hire date</label><input className="input" name="hireDate" type="date" defaultValue={dateInput(hire.hire_date)} required /></div>
              <div><label className="label">Return due date</label><input className="input" name="returnDueDate" type="date" defaultValue={dateInput(hire.return_due_date)} required /></div>
              <div><label className="label">Hire cost before VAT (£)</label><input className="input" name="hireCost" type="number" min="0" step="0.01" value={hireCost} onChange={(event) => setHireCost(event.target.value)} required /></div>
              <div><label className="label">Late return charge per day (£)</label><input className="input" name="lateReturnDailyCharge" type="number" min="0" step="0.01" defaultValue={hire.late_return_daily_charge} required /></div>
              <div><label className="label">Security deposit (£)</label><input className="input" name="securityDeposit" type="number" min="0" step="0.01" value={securityDeposit} onChange={(event) => setSecurityDeposit(event.target.value)} required /></div>
              <div><label className="label">Payment method</label><select className="input" name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as HirePaymentMethod)}><option value="CASH">Cash</option><option value="CARD">Card</option></select></div>
              <div><label className="label">Extra charge (£)</label><input className="input" name="extraCharge" type="number" min="0" step="0.01" value={extraCharge} onChange={(event) => setExtraCharge(event.target.value)} /></div>
              <div className="sm:col-span-2 grid gap-3 bg-cream p-4 text-sm sm:grid-cols-4">
                <Summary label="VAT" value={formatMoney(amounts.hireVat)} />
                <Summary label="Hire total incl. VAT" value={formatMoney(amounts.hireTotal)} />
                <Summary label="Card fee" value={formatMoney(amounts.cardProcessingFee)} />
                <Summary label="Return amount" value={formatMoney(amounts.returnAmount)} />
              </div>
              <div className="sm:col-span-2"><label className="label">Internal notes</label><input className="input" name="notes" defaultValue={hire.notes ?? ""} /></div>
            </div>
            <p className="mt-4 text-xs text-ink/50">Save changes before sending the customer SMS. The SMS always uses the latest saved values.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" disabled={pending} onClick={() => setEditOpen(false)} type="button">Cancel</button>
              <button className="btn-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}

      {sendOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg border-t-4 border-brand-600 bg-white p-6 shadow-2xl">
            <p className="eyebrow">Send hire SMS</p>
            <h2 className="mt-2 text-3xl font-normal">{hire.hire_sms_sent_at ? "Resend message?" : "Send message?"}</h2>
            <div className="my-5 grid gap-3 bg-cream p-4 text-sm sm:grid-cols-2">
              <Summary label="Customer" value={hire.customers?.full_name ?? "Unknown"} />
              <Summary label="Instrument" value={hire.instrument} />
              <Summary label="Hire total incl. VAT" value={formatMoney(hire.hire_total)} />
              <Summary label="Deposit" value={formatMoney(hire.security_deposit)} />
            </div>
            <p className="text-sm text-ink/60">Confirm the hire details are correct before sending. This will update the SMS sent timestamp.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" disabled={pending} onClick={() => setSendOpen(false)} type="button">Cancel</button>
              <button className="btn-primary" disabled={pending} onClick={sendSms} type="button">{pending ? "Sending…" : "Send SMS"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function dateInput(value: string) {
  return value.slice(0, 10);
}
