import Link from "next/link";
import { ArrowRight, Music, Plus, Search, Wrench } from "lucide-react";
import { HireReturnAction, HireRevertAction } from "@/components/hire-return-action";
import { HireStatusBadge } from "@/components/hire-status-badge";
import { StatusBadge } from "@/components/status-badge";
import { StatusActions } from "@/components/status-actions";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { requireAdmin } from "@/lib/auth";
import type { Hire, Repair } from "@/lib/types";
import { formatDate, formatMoney, tryNormalizeUkPhone } from "@/lib/utils";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { supabase } = await requireAdmin();
  let repairs: Repair[] = [];
  let hires: Hire[] = [];

  if (q.trim()) {
    const [{ data: repairData }, { data: hireData }] = await Promise.all([
      supabase
      .from("repairs")
      .select("*, customers(*)")
      .order("received_date", { ascending: false })
        .limit(50),
      supabase
        .from("hires")
        .select("*, customers(*)")
        .order("hire_date", { ascending: false })
        .limit(50),
    ]);

    const query = q.trim().toLowerCase();
    const normalizedPhoneQuery = tryNormalizeUkPhone(q);
    repairs = ((repairData ?? []) as Repair[]).filter(
      (repair) =>
        repair.repair_number.toLowerCase().includes(query) ||
        repair.instrument.toLowerCase().includes(query) ||
        repair.customers?.full_name.toLowerCase().includes(query) ||
        repair.customers?.phone_number.includes(normalizedPhoneQuery ?? query),
    );
    hires = ((hireData ?? []) as Hire[]).filter(
      (hire) =>
        hire.hire_number.toLowerCase().includes(query) ||
        hire.instrument.toLowerCase().includes(query) ||
        hire.customers?.full_name.toLowerCase().includes(query) ||
        hire.customers?.phone_number.includes(normalizedPhoneQuery ?? query),
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10 border-b border-black/10 pb-6">
        <p className="eyebrow">JAS Musicals internal repairs</p>
        <h1 className="mt-2 text-4xl font-normal">Repair management</h1>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Link
          className="group card border-t-4 border-t-gold p-7 transition hover:-translate-y-1 hover:border-brand-600"
          href="/admin/repairs/new"
        >
          <span className="mb-8 inline-flex bg-ink p-3 text-white">
            <Plus size={24} />
          </span>
          <p className="eyebrow">New intake</p>
          <h2 className="mt-2 text-3xl font-normal">Add a repair</h2>
          <p className="mt-3 text-sm leading-6 text-ink/55">
            Register a customer and instrument, create a repair number, and send
            the received notification.
          </p>
          <span className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-brand-600">
            Add repair <ArrowRight className="transition group-hover:translate-x-1" size={16} />
          </span>
        </Link>

        <Link
          className="group card border-t-4 border-t-gold p-7 transition hover:-translate-y-1 hover:border-brand-600"
          href="/admin/hires/new"
        >
          <span className="mb-8 inline-flex bg-ink p-3 text-white">
            <Music size={24} />
          </span>
          <p className="eyebrow">New hire</p>
          <h2 className="mt-2 text-3xl font-normal">Add a hire</h2>
          <p className="mt-3 text-sm leading-6 text-ink/55">
            Register an instrument hire, calculate VAT and deposit return, and send
            the hire notification.
          </p>
          <span className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-brand-600">
            Add hire <ArrowRight className="transition group-hover:translate-x-1" size={16} />
          </span>
        </Link>

        <div className="card border-t-4 border-t-brand-600 p-7">
          <span className="mb-8 inline-flex bg-ink p-3 text-white">
            <Wrench size={24} />
          </span>
          <p className="eyebrow">Existing repair</p>
          <h2 className="mt-2 text-3xl font-normal">Update repair status</h2>
          <p className="mb-6 mt-3 text-sm leading-6 text-ink/55">
            Find a repair by repair number, customer name, phone number, or
            instrument.
          </p>
          <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">
            <span>Received</span><ArrowRight size={12} /><span>Done</span><ArrowRight size={12} /><span>Collected</span><span className="text-red-700">or Cancelled</span>
          </div>
          <form className="flex gap-2">
            <SearchAutocomplete
              defaultValue={q}
              name="q"
              placeholder="Repair number, customer, phone…"
              required
              scope="repairs"
              submitOnSelect
            />
            <button className="btn-primary" aria-label="Search repairs">
              <Search size={17} />
            </button>
          </form>
        </div>

        <div className="card border-t-4 border-t-brand-600 p-7">
          <span className="mb-8 inline-flex bg-ink p-3 text-white">
            <Music size={24} />
          </span>
          <p className="eyebrow">Existing hire</p>
          <h2 className="mt-2 text-3xl font-normal">Update hire status</h2>
          <p className="mb-6 mt-3 text-sm leading-6 text-ink/55">
            Find a hire by hire reference, customer name, phone number, or
            instrument.
          </p>
          <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">
            <span>Hired</span><ArrowRight size={12} /><span>Returned</span><span className="text-orange-700">or Revert</span>
          </div>
          <form className="flex gap-2">
            <SearchAutocomplete
              defaultValue={q}
              name="q"
              placeholder="Hire number, customer, phone…"
              required
              scope="hires"
              submitOnSelect
            />
            <button className="btn-primary" aria-label="Search hires">
              <Search size={17} />
            </button>
          </form>
        </div>
      </section>

      {q && (
        <section className="card mt-7 overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-bold">Matching repairs</h2>
            <span className="text-xs text-ink/45">{repairs.length} results</span>
          </div>
          <div className="divide-y divide-black/10">
            {repairs.map((repair) => (
              <div
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-brand-50"
                key={repair.id}
              >
                <Link className="min-w-0 flex-1" href={`/admin/repairs/${repair.id}`}>
                  <p className="font-bold text-brand-600">{repair.repair_number}</p>
                  <p className="mt-1 text-sm">
                    {repair.customers?.full_name} · {repair.instrument}
                  </p>
                  <p className="mt-1 text-xs text-ink/45">
                    Received {formatDate(repair.received_date)} · Amount {formatMoney(repair.amount)}
                  </p>
                </Link>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <StatusBadge status={repair.status} />
                  <StatusActions repairId={repair.id} status={repair.status} customerName={repair.customers?.full_name ?? "Unknown customer"} instrument={repair.instrument} compact />
                  <Link
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                    href={`/admin/repairs/${repair.id}`}
                  >
                    Details <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
            {!repairs.length && (
              <p className="p-8 text-center text-sm text-ink/50">
                No repairs found for “{q}”.
              </p>
            )}
          </div>
        </section>
      )}

      {q && (
        <section className="card mt-7 overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-bold">Matching hires</h2>
            <span className="text-xs text-ink/45">{hires.length} results</span>
          </div>
          <div className="divide-y divide-black/10">
            {hires.map((hire) => (
              <div
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-brand-50"
                key={hire.id}
              >
                <Link className="min-w-0 flex-1" href="/admin/hires">
                  <p className="font-bold text-brand-600">{hire.hire_number}</p>
                  <p className="mt-1 text-sm">
                    {hire.customers?.full_name} · {hire.instrument}
                  </p>
                  <p className="mt-1 text-xs text-ink/45">
                    Hire {formatDate(hire.hire_date)} · Due {formatDate(hire.return_due_date)} · Return amount {formatMoney(hire.return_amount)}
                  </p>
                </Link>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <HireStatusBadge status={hire.status} />
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
                  <Link
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                    href="/admin/hires"
                  >
                    All hires <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
            {!hires.length && (
              <p className="p-8 text-center text-sm text-ink/50">
                No hires found for “{q}”.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
