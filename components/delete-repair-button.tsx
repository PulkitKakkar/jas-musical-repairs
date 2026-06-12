"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRepairAction } from "@/app/actions";

export function DeleteRepairButton({
  repairId,
  repairNumber,
  customerName,
  instrument,
  compact = false,
}: {
  repairId: string;
  repairNumber: string;
  customerName: string;
  instrument: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function remove() {
    setPending(true);
    const result = await deleteRepairAction(repairId, confirmation);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${repairNumber} permanently deleted`);
    setOpen(false);
    router.push("/admin/repairs");
    router.refresh();
  }

  return (
    <>
      <button className={compact ? "whitespace-nowrap border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100" : "inline-flex items-center gap-2 border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"} onClick={() => setOpen(true)} type="button">
        {!compact && <Trash2 size={16} />}Delete
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby={`delete-dialog-${repairId}`}>
          <div className="w-full max-w-lg border-t-4 border-red-700 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-red-700">Permanent deletion</p>
            <h2 className="mt-2 text-3xl font-normal" id={`delete-dialog-${repairId}`}>Delete this repair?</h2>
            <div className="my-5 bg-red-50 p-4 text-sm"><p><strong>Repair:</strong> {repairNumber}</p><p><strong>Customer:</strong> {customerName}</p><p><strong>Instrument:</strong> {instrument}</p></div>
            <p className="mb-4 text-sm font-bold text-red-800">This permanently removes the repair and its audit history. It cannot be undone.</p>
            <label className="label" htmlFor={`delete-confirm-${repairId}`}>Type {repairNumber} to confirm</label>
            <input autoComplete="off" className="input" id={`delete-confirm-${repairId}`} onChange={(event) => setConfirmation(event.target.value)} value={confirmation} />
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" disabled={pending} onClick={() => { setOpen(false); setConfirmation(""); }} type="button">Keep repair</button>
              <button className="bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40" disabled={pending || confirmation !== repairNumber} onClick={remove} type="button">{pending ? "Deleting…" : "Permanently delete"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
