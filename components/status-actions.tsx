"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateStatusAction } from "@/app/actions";
import type { RepairStatus } from "@/lib/types";
import { todayInputValue } from "@/lib/utils";

export function StatusActions({
  repairId,
  status,
  compact = false,
}: {
  repairId: string;
  status: RepairStatus;
  compact?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [eventDate, setEventDate] = useState(todayInputValue());
  const router = useRouter();

  async function update(next: RepairStatus) {
    const label = next === "DONE" ? "Done" : "Collected";
    if (!confirm(`Mark this repair as ${label}? The customer will be notified by SMS.`)) return;
    setPending(true);
    const result = await updateStatusAction(repairId, next, eventDate);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(`Repair marked as ${label}`);
      setEditing(false);
      router.refresh();
    }
  }

  const className = compact ? "btn-primary whitespace-nowrap px-3 py-2 text-xs" : "btn-primary";
  const nextStatus = status === "RECEIVED" ? "DONE" : status === "DONE" ? "COLLECTED" : null;
  const buttonLabel = nextStatus === "DONE" ? "Mark Done" : "Mark Collected";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {nextStatus && !editing && <button className={className} onClick={() => setEditing(true)}>{buttonLabel}</button>}
      {nextStatus && editing && (
        <>
          <input
            aria-label={`${buttonLabel} date`}
            className="input w-auto min-w-36 py-2 text-xs"
            max={todayInputValue()}
            onChange={(event) => setEventDate(event.target.value)}
            type="date"
            value={eventDate}
          />
          <button className={className} disabled={pending || !eventDate} onClick={() => update(nextStatus)}>
            {pending ? "Updating…" : "Confirm"}
          </button>
          <button className="text-xs font-bold text-ink/45 hover:text-ink" disabled={pending} onClick={() => setEditing(false)}>Cancel</button>
        </>
      )}
      {status === "COLLECTED" && compact && <span className="text-xs font-bold text-emerald-700">No action needed</span>}
    </div>
  );
}
