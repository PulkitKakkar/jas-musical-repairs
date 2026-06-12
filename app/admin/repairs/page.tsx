import Link from "next/link";
import { Clock3, Plus } from "lucide-react";
import { StatusActions } from "@/components/status-actions";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import type { Repair, RepairStatus } from "@/lib/types";
import { durationDays, formatDate, formatDuration } from "@/lib/utils";
import { tryNormalizeUkPhone } from "@/lib/utils";

type Filters = {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
};

export default async function AllRepairsPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("repairs")
    .select("*, customers(*)")
    .order("received_date", { ascending: false });

  if (filters.status && ["RECEIVED", "DONE", "COLLECTED", "CANCELLED"].includes(filters.status)) {
    query = query.eq("status", filters.status);
  }
  if (filters.from) query = query.gte("received_date", `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.lte("received_date", `${filters.to}T23:59:59.999Z`);

  const { data } = await query;
  const normalizedPhoneQuery = filters.q ? tryNormalizeUkPhone(filters.q) : null;
  const textQuery = filters.q?.trim().toLowerCase();
  const repairs = ((data ?? []) as Repair[]).filter((repair) =>
    !textQuery ||
    repair.repair_number.toLowerCase().includes(textQuery) ||
    repair.instrument.toLowerCase().includes(textQuery) ||
    repair.customers?.full_name.toLowerCase().includes(textQuery) ||
    repair.customers?.phone_number.includes(normalizedPhoneQuery ?? textQuery),
  );
  const openRepairs = repairs.filter((repair) => !["COLLECTED", "CANCELLED"].includes(repair.status));
  const averageOpenDays = openRepairs.length
    ? Math.round(openRepairs.reduce((total, repair) => total + (durationDays(repair.received_date, null) ?? 0), 0) / openRepairs.length)
    : 0;
  const longestOpenDays = openRepairs.length
    ? Math.max(...openRepairs.map((repair) => durationDays(repair.received_date, null) ?? 0))
    : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-6">
        <div>
          <p className="eyebrow">Repair register</p>
          <h1 className="mt-2 text-4xl font-normal">All repairs</h1>
        </div>
        <Link className="btn-primary" href="/admin/repairs/new"><Plus size={16} />Add repair</Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 border-l-4 border-brand-600 bg-white p-4 text-xs font-bold uppercase tracking-wider text-ink/55">
        <span>Received</span><span>→</span><span>Done</span><span>→</span><span>Collected</span><span className="ml-2 text-red-700">or Cancelled</span>
        <span className="ml-2 normal-case tracking-normal text-ink/40">Every change requires a date and confirmation.</span>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Filtered entries" value={String(repairs.length)} />
        <Metric label="Average open time" value={formatDuration(averageOpenDays)} />
        <Metric label="Longest open repair" value={formatDuration(longestOpenDays)} />
      </section>

      <form className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <input className="input" defaultValue={filters.q} name="q" placeholder="Repair, customer, phone, instrument…" />
        <select className="input" defaultValue={filters.status ?? ""} name="status">
          <option value="">All statuses</option>
          <option value="RECEIVED">Received</option>
          <option value="DONE">Done</option>
          <option value="COLLECTED">Collected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input aria-label="Intake date from" className="input" defaultValue={filters.from} name="from" type="date" />
        <input aria-label="Intake date to" className="input" defaultValue={filters.to} name="to" type="date" />
        <div className="flex gap-2"><button className="btn-primary flex-1">Apply filters</button><Link className="btn-secondary" href="/admin/repairs">Clear</Link></div>
      </form>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-wider text-ink/40">
            <tr>
              <th className="px-4 py-4">Repair</th>
              <th className="px-4 py-4">Customer / Instrument</th>
              <th className="px-4 py-4">Phone</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Intake</th>
              <th className="px-4 py-4">Done</th>
              <th className="px-4 py-4">Collected</th>
              <th className="px-4 py-4">Cancelled</th>
              <th className="px-4 py-4">Repair time</th>
              <th className="px-4 py-4">Total elapsed</th>
              <th className="px-4 py-4">Next action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {repairs.map((repair) => (
              <RepairRow key={repair.id} repair={repair} />
            ))}
          </tbody>
        </table>
        {!repairs.length && <p className="p-10 text-center text-sm text-ink/50">No repairs match these filters.</p>}
      </section>
    </div>
  );
}

function RepairRow({ repair }: { repair: Repair }) {
  const repairEndDate = repair.completed_date ?? repair.cancelled_date;
  const repairDays = durationDays(repair.received_date, repairEndDate);
  const terminalDate = repair.collected_date ?? repair.cancelled_date;
  const totalDays = durationDays(repair.received_date, terminalDate);
  return (
    <tr className={`align-top ${repair.status === "CANCELLED" ? "bg-red-50/70 hover:bg-red-50" : "hover:bg-brand-50"}`}>
      <td className="px-4 py-4"><Link className="font-bold text-brand-600 hover:underline" href={`/admin/repairs/${repair.id}`}>{repair.repair_number}</Link></td>
      <td className="px-4 py-4"><p className="font-bold">{repair.customers?.full_name}</p><p className="text-xs text-ink/50">{repair.instrument}</p></td>
      <td className="px-4 py-4 whitespace-nowrap">{repair.customers?.phone_number}</td>
      <td className="px-4 py-4"><StatusBadge status={repair.status as RepairStatus} /></td>
      <td className="px-4 py-4">{formatDate(repair.received_date)}</td>
      <td className="px-4 py-4">{formatDate(repair.completed_date)}</td>
      <td className="px-4 py-4">{formatDate(repair.collected_date)}</td>
      <td className="px-4 py-4">{formatDate(repair.cancelled_date)}</td>
      <td className="px-4 py-4"><Duration value={repairDays} live={!repairEndDate} /></td>
      <td className="px-4 py-4"><Duration value={totalDays} live={!terminalDate} /></td>
      <td className="px-4 py-4"><StatusActions repairId={repair.id} status={repair.status} customerName={repair.customers?.full_name ?? "Unknown customer"} instrument={repair.instrument} compact /></td>
    </tr>
  );
}

function Duration({ value, live }: { value: number | null; live: boolean }) {
  return <span className={live && (value ?? 0) >= 14 ? "font-bold text-orange-700" : ""}>{live && <Clock3 className="mr-1 inline" size={13} />}{formatDuration(value)}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-ink/40">{label}</p><p className="mt-2 text-3xl">{value}</p></div>;
}
