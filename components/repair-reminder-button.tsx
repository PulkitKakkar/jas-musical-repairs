"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendRepairCollectionReminderAction } from "@/app/actions";
import { LoadingOverlay } from "@/components/loading-overlay";
import { formatDate } from "@/lib/utils";

export function RepairReminderButton({
  repairId,
  repairNumber,
  customerName,
  instrument,
  lastSentAt,
}: {
  repairId: string;
  repairNumber: string;
  customerName: string;
  instrument: string;
  lastSentAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function send() {
    setPending(true);
    const result = await sendRepairCollectionReminderAction(repairId);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Collection reminder sent");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      {pending && <LoadingOverlay />}
      <button className="btn-secondary whitespace-nowrap px-3 py-2 text-xs" onClick={() => setOpen(true)} type="button">Send SMS reminder</button>
      {lastSentAt && <span className="text-[11px] font-medium text-ink/45">Last sent {formatDate(lastSentAt)}</span>}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg border-t-4 border-brand-600 bg-white p-6 shadow-2xl">
            <p className="eyebrow">Manual collection reminder</p>
            <h2 className="mt-2 text-3xl font-normal">Send SMS?</h2>
            <div className="my-5 grid gap-3 bg-cream p-4 text-sm sm:grid-cols-2">
              <Summary label="Repair" value={repairNumber} />
              <Summary label="Customer" value={customerName} />
              <Summary label="Instrument" value={instrument} />
              <Summary label="Last sent" value={lastSentAt ? formatDate(lastSentAt) : "Not sent"} />
            </div>
            <p className="text-sm text-ink/60">This sends the collection reminder SMS. The system will block another reminder for this repair on the same day.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" disabled={pending} onClick={() => setOpen(false)} type="button">Cancel</button>
              <button className="btn-primary" disabled={pending} onClick={send} type="button">{pending ? "Sending…" : "Send SMS"}</button>
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
