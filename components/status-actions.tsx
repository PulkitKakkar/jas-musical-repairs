"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { revertStatusAction, updateStatusAction } from "@/app/actions";
import type { RepairStatus } from "@/lib/types";
import { todayInputValue } from "@/lib/utils";

export function StatusActions({
  repairId,
  status,
  customerName,
  instrument,
  compact = false,
}: {
  repairId: string;
  status: RepairStatus;
  customerName: string;
  instrument: string;
  compact?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [targetStatus, setTargetStatus] = useState<RepairStatus | null>(null);
  const [isRollback, setIsRollback] = useState(false);
  const [eventDate, setEventDate] = useState(todayInputValue());
  const router = useRouter();

  async function update(next: RepairStatus) {
    const label = next === "DONE" ? "Done" : "Collected";
    setPending(true);
    const result = await updateStatusAction(repairId, next, eventDate);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(`Repair marked as ${label}`);
      setTargetStatus(null);
      router.refresh();
    }
  }

  async function rollback(previous: RepairStatus) {
    setPending(true);
    const result = await revertStatusAction(repairId, previous);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(`Repair reverted to ${previous}`);
      setTargetStatus(null);
      router.refresh();
    }
  }

  function openForward(status: RepairStatus) {
    setIsRollback(false);
    setTargetStatus(status);
  }

  function openRollback(status: RepairStatus) {
    setIsRollback(true);
    setTargetStatus(status);
  }

  const className = compact ? "btn-primary whitespace-nowrap px-3 py-2 text-xs" : "btn-primary";
  const nextStatus = status === "RECEIVED" ? "DONE" : status === "DONE" ? "COLLECTED" : null;
  const previousStatus = status === "COLLECTED" ? "DONE" : status === "DONE" ? "RECEIVED" : null;
  const buttonLabel = nextStatus === "DONE" ? "Mark Done" : "Mark Collected";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {nextStatus && <button className={className} onClick={() => openForward(nextStatus)} type="button">{buttonLabel}</button>}
      {previousStatus && <button className="btn-secondary whitespace-nowrap px-3 py-2 text-xs" onClick={() => openRollback(previousStatus)} type="button">Revert to {previousStatus === "DONE" ? "Done" : "Received"}</button>}
      {targetStatus && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby={`status-dialog-${repairId}`}>
          <div className={`w-full max-w-lg border-t-4 ${isRollback ? "border-orange-500" : "border-brand-600"} bg-white p-6 shadow-2xl`}>
            <p className="eyebrow">{isRollback ? "Confirm status rollback" : "Confirm status update"}</p>
            <h2 className="mt-2 text-3xl font-normal" id={`status-dialog-${repairId}`}>{isRollback ? `Revert to ${targetStatus}?` : `${buttonLabel}?`}</h2>
            <div className="my-5 grid gap-3 bg-cream p-4 text-sm sm:grid-cols-2">
              <Summary label="Customer" value={customerName} />
              <Summary label="Instrument" value={instrument} />
              <Summary label="Current status" value={status} />
              <Summary label="New status" value={targetStatus} />
            </div>
            {!isRollback && targetStatus === "COLLECTED" && (
              <p className="mb-5 border-l-4 border-orange-500 bg-orange-50 p-3 text-sm font-bold text-orange-900">
                Confirm collection carefully. If selected accidentally, it can only be reverted through a separate audited rollback.
              </p>
            )}
            {isRollback ? (
              <p className="mb-5 border-l-4 border-orange-500 bg-orange-50 p-3 text-sm font-bold text-orange-900">
                This rollback will remove the {status === "COLLECTED" ? "collected" : "completed"} date. It will be recorded in the audit log. The customer will not be notified.
              </p>
            ) : (
              <>
                <label className="label" htmlFor={`status-date-${repairId}`}>{targetStatus === "DONE" ? "Completed date" : "Collected date"}</label>
                <input
                  id={`status-date-${repairId}`}
                  className="input"
                  max={todayInputValue()}
                  onChange={(event) => setEventDate(event.target.value)}
                  type="date"
                  value={eventDate}
                />
                <p className="mt-3 text-xs text-ink/50">Confirming will notify the customer by configured SMS and email channels.</p>
              </>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" disabled={pending} onClick={() => setTargetStatus(null)} type="button">Cancel</button>
              <button className="btn-primary" disabled={pending || (!isRollback && !eventDate)} onClick={() => isRollback ? rollback(targetStatus) : update(targetStatus)} type="button">
                {pending ? "Updating…" : isRollback ? `Confirm Revert to ${targetStatus}` : `Confirm ${targetStatus === "DONE" ? "Done" : "Collected"}`}
              </button>
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
