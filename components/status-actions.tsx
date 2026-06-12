"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateStatusAction } from "@/app/actions";
import type { RepairStatus } from "@/lib/types";

export function StatusActions({ repairId, status }: { repairId: string; status: RepairStatus }) {
  const [pending, setPending] = useState(false);

  async function update(next: RepairStatus) {
    if (!confirm(`Mark this repair as ${next}? This will notify the customer by SMS.`)) return;
    setPending(true);
    const result = await updateStatusAction(repairId, next);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else toast.success(`Repair marked as ${next}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "RECEIVED" && <button className="btn-primary" disabled={pending} onClick={() => update("DONE")}>Mark as Done</button>}
      {status === "DONE" && <button className="btn-primary" disabled={pending} onClick={() => update("COLLECTED")}>Mark as Collected</button>}
    </div>
  );
}
