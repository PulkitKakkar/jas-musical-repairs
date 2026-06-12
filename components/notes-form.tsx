"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateNotesAction } from "@/app/actions";

export function NotesForm({ repairId, initialNotes }: { repairId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, setPending] = useState(false);
  return (
    <div>
      <textarea className="input min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes, visible only to admins" />
      <button className="btn-secondary mt-3" disabled={pending} onClick={async () => {
        setPending(true);
        const result = await updateNotesAction(repairId, notes);
        setPending(false);
        if (result?.error) toast.error(result.error);
        else toast.success("Notes saved");
      }}>{pending ? "Saving…" : "Save notes"}</button>
    </div>
  );
}
