import { notFound } from "next/navigation";
import { ClipboardList, CircleCheck, CircleDot } from "lucide-react";
import { NotesForm } from "@/components/notes-form";
import { ReceiptActions } from "@/components/receipt-actions";
import { StatusActions } from "@/components/status-actions";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import type { AuditLog, Repair } from "@/lib/types";
import { durationDays, formatDate, formatDuration, formatMoney } from "@/lib/utils";

export default async function RepairDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: repair }, { data: logData }] = await Promise.all([
    supabase.from("repairs").select("*, customers(*)").eq("id", id).single(),
    supabase.from("audit_logs").select("*").eq("repair_id", id).order("created_at", { ascending: false }),
  ]);
  if (!repair) notFound();
  const item = repair as Repair;
  const logs = (logData ?? []) as AuditLog[];
  const timeline = [
    ["Received", item.received_date, true],
    ["Done", item.completed_date, Boolean(item.completed_date)],
    ["Collected", item.collected_date, Boolean(item.collected_date)],
    ["Cancelled", item.cancelled_date, Boolean(item.cancelled_date)],
  ] as const;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-brand-600">{item.repair_number}</p><h1 className="text-3xl font-black">{item.instrument}</h1></div><div className="flex items-center gap-3"><StatusBadge status={item.status} /><StatusActions repairId={item.id} status={item.status} customerName={item.customers?.full_name ?? "Unknown customer"} instrument={item.instrument} /></div></div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 print:hidden">
            <TimeCard label="Repair time" days={durationDays(item.received_date, item.completed_date ?? item.cancelled_date)} live={!item.completed_date && !item.cancelled_date} />
            <TimeCard label="Total elapsed time" days={durationDays(item.received_date, item.collected_date ?? item.cancelled_date)} live={!item.collected_date && !item.cancelled_date} />
          </div>
          <div className="card p-6 print:shadow-none"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-ink/40">JAS Musicals repair receipt</p><h2 className="mt-1 text-2xl font-black">{item.repair_number}</h2></div><StatusBadge status={item.status} /></div>
            <dl className="grid gap-5 text-sm sm:grid-cols-2"><Detail label="Customer" value={item.customers?.full_name} /><Detail label="Phone" value={item.customers?.phone_number} /><Detail label="Email" value={item.customers?.email ?? "—"} /><Detail label="Instrument" value={item.instrument} /><Detail label="Issue" value={item.issue_description} /><Detail label="Amount" value={formatMoney(item.amount)} /></dl>
            <div className="mt-7"><ReceiptActions /></div>
          </div>
          <div className="card p-6 print:hidden"><h2 className="mb-4 font-bold">Internal notes</h2><NotesForm repairId={item.id} initialNotes={item.notes ?? ""} /></div>
        </section>
        <aside className="space-y-6 print:hidden">
          <div className="card p-6"><h2 className="mb-5 font-bold">Status timeline</h2><div className="space-y-5">{timeline.map(([label, date, complete]) => <div className="flex gap-3" key={label}>{complete ? <CircleCheck className="text-brand-600" size={20} /> : <CircleDot className="text-ink/20" size={20} />}<div><p className="text-sm font-bold">{label}</p><p className="text-xs text-ink/45">{formatDate(date)}</p></div></div>)}</div></div>
          <div className="card p-6"><h2 className="mb-4 flex items-center gap-2 font-bold"><ClipboardList size={18} />Audit log</h2><div className="space-y-4">{logs.map((log) => <div key={log.id} className="border-l-2 border-brand-100 pl-3 text-sm"><p className="font-medium">{log.old_status} → {log.new_status}</p><p className="text-xs text-ink/45">{formatDate(log.created_at)}</p></div>)}{!logs.length && <p className="text-sm text-ink/45">No status changes yet.</p>}</div></div>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return <div><dt className="text-xs font-bold uppercase tracking-wider text-ink/40">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

function TimeCard({ label, days, live }: { label: string; days: number | null; live: boolean }) {
  return <div className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-ink/40">{label}</p><p className={`mt-2 text-3xl ${live && (days ?? 0) >= 14 ? "text-orange-700" : ""}`}>{formatDuration(days)}</p><p className="mt-1 text-xs text-ink/45">{live ? "Currently counting" : "Final duration"}</p></div>;
}
