import Link from "next/link";
import { Clock3, Plus } from "lucide-react";
import { HireReturnAction, HireRevertAction } from "@/components/hire-return-action";
import { HireStatusBadge } from "@/components/hire-status-badge";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { requireAdmin } from "@/lib/auth";
import type { Hire, HireStatus } from "@/lib/types";
import { formatDate, formatDuration, formatMoney, inclusiveDurationDays, tryNormalizePhone } from "@/lib/utils";

type Filters = {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
};

export default async function HiresPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("hires")
    .select("*, customers(*)")
    .order("hire_date", { ascending: false });

  if (filters.status && ["HIRED", "RETURNED"].includes(filters.status)) {
    query = query.eq("status", filters.status);
  }
  if (filters.from) query = query.gte("hire_date", `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.lte("hire_date", `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query;
  const normalizedPhoneQuery = filters.q ? tryNormalizePhone(filters.q) : null;
  const textQuery = filters.q?.trim().toLowerCase();
  const hires = ((data ?? []) as Hire[]).filter((hire) =>
    !textQuery ||
    hire.hire_number.toLowerCase().includes(textQuery) ||
    hire.instrument.toLowerCase().includes(textQuery) ||
    hire.customers?.full_name.toLowerCase().includes(textQuery) ||
    hire.customers?.phone_number.includes(normalizedPhoneQuery ?? textQuery),
  );

  const activeHires = hires.filter((hire) => hire.status === "HIRED");
  const overdueHires = activeHires.filter((hire) => new Date(hire.return_due_date) < startOfToday());
  const totalDepositsHeld = activeHires.reduce((total, hire) => total + Number(hire.security_deposit), 0);
  const totalReturnDue = activeHires.reduce((total, hire) => total + Number(hire.return_amount), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-6">
        <div>
          <p className="eyebrow">Instrument hire</p>
          <h1 className="mt-2 text-4xl font-normal">Hires</h1>
          <p className="mt-2 text-sm text-ink/55">Track hired instruments, return dates, deposits, VAT and card deductions.</p>
        </div>
        <Link className="btn-primary" href="/admin/hires/new"><Plus size={16} />Add hire</Link>
      </div>

      {error && <p className="mb-6 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error.message}</p>}

      <section className="mb-6 grid gap-4 sm:grid-cols-4">
        <Metric label="Filtered hires" value={String(hires.length)} />
        <Metric label="Currently hired" value={String(activeHires.length)} />
        <Metric label="Overdue" value={String(overdueHires.length)} tone={overdueHires.length ? "danger" : "default"} />
        <Metric label="Deposits held" value={formatMoney(totalDepositsHeld)} />
      </section>

      <section className="card mb-6 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-ink/40">Estimated active return amount</p>
        <p className="mt-2 text-3xl">{formatMoney(totalReturnDue)}</p>
        <p className="mt-1 text-xs text-ink/45">Calculated as deposit minus hire total including VAT, extra charge, and card fee where applicable.</p>
      </section>

      <form className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <SearchAutocomplete defaultValue={filters.q} name="q" placeholder="Hire, customer, phone, instrument…" scope="hires" />
        <select className="input" defaultValue={filters.status ?? ""} name="status">
          <option value="">All statuses</option>
          <option value="HIRED">Hired</option>
          <option value="RETURNED">Returned</option>
        </select>
        <input aria-label="Hire date from" className="input" defaultValue={filters.from} name="from" type="date" />
        <input aria-label="Hire date to" className="input" defaultValue={filters.to} name="to" type="date" />
        <div className="flex gap-2"><button className="btn-primary flex-1">Apply filters</button><Link className="btn-secondary" href="/admin/hires">Clear</Link></div>
      </form>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[1500px] text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-wider text-ink/40">
            <tr>
              <th className="px-4 py-4">Hire</th>
              <th className="px-4 py-4">Customer / Instrument</th>
              <th className="px-4 py-4">Phone</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Hire date</th>
              <th className="px-4 py-4">Return due</th>
              <th className="px-4 py-4">Returned</th>
              <th className="px-4 py-4">Duration</th>
              <th className="px-4 py-4">Hire total</th>
              <th className="px-4 py-4">Deposit</th>
              <th className="px-4 py-4">Payment</th>
              <th className="px-4 py-4">Extra</th>
              <th className="px-4 py-4">Return amount</th>
              <th className="px-4 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {hires.map((hire) => <HireRow hire={hire} key={hire.id} />)}
          </tbody>
        </table>
        {!hires.length && <p className="p-10 text-center text-sm text-ink/50">No hires match these filters.</p>}
      </section>
    </div>
  );
}

function HireRow({ hire }: { hire: Hire }) {
  const isOverdue = hire.status === "HIRED" && new Date(hire.return_due_date) < startOfToday();
  const activeDuration = hire.status === "HIRED" ? inclusiveDurationDays(hire.hire_date, null) : hire.hire_duration_days;
  return (
    <tr className={`align-top ${isOverdue ? "bg-orange-50/70 hover:bg-orange-50" : "hover:bg-brand-50"}`}>
      <td className="px-4 py-4 font-bold text-brand-700">{hire.hire_number}</td>
      <td className="px-4 py-4"><p className="font-bold">{hire.customers?.full_name}</p><p className="text-xs text-ink/50">{hire.instrument}</p></td>
      <td className="whitespace-nowrap px-4 py-4">{hire.customers?.phone_number}</td>
      <td className="px-4 py-4"><HireStatusBadge status={hire.status as HireStatus} /></td>
      <td className="px-4 py-4">{formatDate(hire.hire_date)}</td>
      <td className={`px-4 py-4 ${isOverdue ? "font-bold text-orange-700" : ""}`}>{formatDate(hire.return_due_date)}</td>
      <td className="px-4 py-4">{formatDate(hire.returned_date)}</td>
      <td className="px-4 py-4">{hire.status === "HIRED" && <Clock3 className="mr-1 inline" size={13} />}{formatDuration(activeDuration)}</td>
      <td className="px-4 py-4">{formatMoney(hire.hire_total)}</td>
      <td className="px-4 py-4">{formatMoney(hire.security_deposit)}</td>
      <td className="px-4 py-4">{hire.payment_method === "CARD" ? `Card (${formatMoney(hire.card_processing_fee)} fee)` : "Cash"}</td>
      <td className="px-4 py-4">{formatMoney(hire.extra_charge)}</td>
      <td className={`px-4 py-4 font-bold ${Number(hire.return_amount) < 0 ? "text-red-700" : ""}`}>{formatMoney(hire.return_amount)}</td>
      <td className="px-4 py-4">
        {hire.status === "HIRED" ? (
          <HireReturnAction
            customerName={hire.customers?.full_name ?? "Unknown customer"}
            hireCost={Number(hire.hire_cost)}
            hireId={hire.id}
            initialExtraCharge={Number(hire.extra_charge)}
            instrument={hire.instrument}
            paymentMethod={hire.payment_method}
            securityDeposit={Number(hire.security_deposit)}
          />
        ) : (
          <HireRevertAction
            customerName={hire.customers?.full_name ?? "Unknown customer"}
            hireId={hire.id}
            instrument={hire.instrument}
          />
        )}
      </td>
    </tr>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" }) {
  return <div className={`card p-5 ${tone === "danger" ? "border-orange-200 bg-orange-50" : ""}`}><p className="text-xs font-bold uppercase tracking-wider text-ink/40">{label}</p><p className="mt-2 text-3xl">{value}</p></div>;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
