"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateStatusAction } from "@/app/actions";
import type { RepairStatus } from "@/lib/types";

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
  const router = useRouter();

  async function update(next: RepairStatus) {
    const label = next === "DONE" ? "Done" : "Collected";
    if (!confirm(`Mark this repair as ${label}? The customer will be notified by SMS.`)) return;
    setPending(true);
    const result = await updateStatusAction(repairId, next);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(`Repair marked as ${label}`);
      router.refresh();
    }
  }

  const className = compact ? "btn-primary whitespace-nowrap px-3 py-2 text-xs" : "btn-primary";

  return (
    <div className="flex flex-wrap gap-2">
      {status === "RECEIVED" && <button className={className} disabled={pending} onClick={() => update("DONE")}>{pending ? "Updating…" : "Mark Done"}</button>}
      {status === "DONE" && <button className={className} disabled={pending} onClick={() => update("COLLECTED")}>{pending ? "Updating…" : "Mark Collected"}</button>}
      {status === "COLLECTED" && compact && <span className="text-xs font-bold text-emerald-700">No action needed</span>}
    </div>
  );
}
