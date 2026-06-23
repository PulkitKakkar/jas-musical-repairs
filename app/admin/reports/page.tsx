import Link from "next/link";
import { ExportButton } from "@/components/export-button";
import { StatusBadge } from "@/components/status-badge";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { requireReportsMaster } from "@/lib/auth";
import type { Repair } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

type DateField = "received_date" | "completed_date" | "collected_date" | "cancelled_date";
type Filters = {
  dateField?: string;
  from?: string;
  to?: string;
  status?: string;
  instrument?: string;
  minAmount?: string;
  maxAmount?: string;
};

const dateFields: Record<DateField, string> = {
  received_date: "Intake date",
  completed_date: "Done date",
  collected_date: "Collected date",
  cancelled_date: "Cancelled date",
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  const { supabase } = await requireReportsMaster();
  const { data } = await supabase
    .from("repairs")
    .select("*, customers(*)")
    .order("received_date", { ascending: false });

  const dateField = isDateField(filters.dateField) ? filters.dateField : "received_date";
  const minAmount = parseAmount(filters.minAmount);
  const maxAmount = parseAmount(filters.maxAmount);
  const instrumentQuery = filters.instrument?.trim().toLowerCase();
  const repairs = ((data ?? []) as Repair[]).filter((repair) => {
    const repairDate = repair[dateField];
    const dateValue = repairDate?.slice(0, 10);
    return (
      (!filters.status || repair.status === filters.status) &&
      (!instrumentQuery || repair.instrument.toLowerCase().includes(instrumentQuery)) &&
      (minAmount === null || Number(repair.amount) >= minAmount) &&
      (maxAmount === null || Number(repair.amount) <= maxAmount) &&
      (!filters.from || Boolean(dateValue && dateValue >= filters.from)) &&
      (!filters.to || Boolean(dateValue && dateValue <= filters.to))
    );
  });

  const totalAmount = repairs.reduce((total, repair) => total + Number(repair.amount), 0);
  const averageAmount = repairs.length ? totalAmount / repairs.length : 0;
  const instrumentTotals = groupRepairs(repairs, (repair) => repair.instrument);
  const statusTotals = groupRepairs(repairs, (repair) => repair.status);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-6">
        <div><p className="eyebrow">Repair analysis</p><h1 className="mt-2 text-4xl font-normal">Reports</h1></div>
        <ExportButton repairs={repairs} />
      </div>

      <form className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <select className="input" defaultValue={dateField} name="dateField" aria-label="Date type">
          {Object.entries(dateFields).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className="input" defaultValue={filters.from} name="from" type="date" aria-label="Date from" />
        <input className="input" defaultValue={filters.to} name="to" type="date" aria-label="Date to" />
        <select className="input" defaultValue={filters.status ?? ""} name="status" aria-label="Status">
          <option value="">All statuses</option>
          <option value="RECEIVED">Received</option>
          <option value="DONE">Done</option>
          <option value="COLLECTED">Collected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <SearchAutocomplete defaultValue={filters.instrument} name="instrument" placeholder="Instrument type" scope="instruments" />
        <input className="input" defaultValue={filters.minAmount} min="0" name="minAmount" placeholder="Minimum amount" step="0.01" type="number" />
        <input className="input" defaultValue={filters.maxAmount} min="0" name="maxAmount" placeholder="Maximum amount" step="0.01" type="number" />
        <div className="flex gap-2"><button className="btn-primary flex-1">Apply filters</button><Link className="btn-secondary" href="/admin/reports">Clear</Link></div>
      </form>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Repairs" value={String(repairs.length)} />
        <Metric label="Total amount" value={formatMoney(totalAmount)} />
        <Metric label="Average amount" value={formatMoney(averageAmount)} />
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <Breakdown title="By instrument" rows={instrumentTotals} />
        <Breakdown title="By status" rows={statusTotals} />
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-wider text-ink/40"><tr><th className="px-4 py-4">Repair</th><th className="px-4 py-4">Customer</th><th className="px-4 py-4">Instrument</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">{dateFields[dateField]}</th><th className="px-4 py-4 text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-black/10">
            {repairs.map((repair) => <tr className={repair.status === "CANCELLED" ? "bg-red-50/70" : "hover:bg-brand-50"} key={repair.id}><td className="px-4 py-4"><Link className="font-bold text-brand-600 hover:underline" href={`/admin/repairs/${repair.id}`}>{repair.repair_number}</Link></td><td className="px-4 py-4"><p className="font-bold">{repair.customers?.full_name}</p><p className="text-xs text-ink/50">{repair.customers?.phone_number}</p></td><td className="px-4 py-4">{repair.instrument}</td><td className="px-4 py-4"><StatusBadge status={repair.status} /></td><td className="px-4 py-4">{formatDate(repair[dateField])}</td><td className="px-4 py-4 text-right font-bold">{formatMoney(repair.amount)}</td></tr>)}
          </tbody>
        </table>
        {!repairs.length && <p className="p-10 text-center text-sm text-ink/50">No repairs match these report filters.</p>}
      </section>
    </div>
  );
}

function isDateField(value?: string): value is DateField {
  return Boolean(value && value in dateFields);
}

function parseAmount(value?: string) {
  if (!value?.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function groupRepairs(repairs: Repair[], key: (repair: Repair) => string) {
  return Object.entries(repairs.reduce<Record<string, { count: number; amount: number }>>((totals, repair) => {
    const label = key(repair);
    totals[label] ??= { count: 0, amount: 0 };
    totals[label].count += 1;
    totals[label].amount += Number(repair.amount);
    return totals;
  }, {})).sort((a, b) => b[1].amount - a[1].amount);
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-ink/40">{label}</p><p className="mt-2 text-3xl">{value}</p></div>;
}

function Breakdown({ title, rows }: { title: string; rows: [string, { count: number; amount: number }][] }) {
  return <div className="card p-5"><h2 className="mb-4 font-bold">{title}</h2><div className="space-y-3">{rows.map(([label, values]) => <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3 text-sm" key={label}><div><p className="font-bold">{label}</p><p className="text-xs text-ink/45">{values.count} repair{values.count === 1 ? "" : "s"}</p></div><p className="font-bold">{formatMoney(values.amount)}</p></div>)}{!rows.length && <p className="text-sm text-ink/45">No matching repairs.</p>}</div></div>;
}
