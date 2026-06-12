import Link from "next/link";
import { ArrowRight, Plus, Search, Wrench } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import type { Repair } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { supabase } = await requireAdmin();
  let repairs: Repair[] = [];

  if (q.trim()) {
    const { data } = await supabase
      .from("repairs")
      .select("*, customers(*)")
      .order("received_date", { ascending: false })
      .limit(50);

    const query = q.trim().toLowerCase();
    repairs = ((data ?? []) as Repair[]).filter(
      (repair) =>
        repair.repair_number.toLowerCase().includes(query) ||
        repair.instrument.toLowerCase().includes(query) ||
        repair.customers?.full_name.toLowerCase().includes(query) ||
        repair.customers?.phone_number.includes(query),
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
          <form className="flex gap-2">
            <input
              className="input"
              defaultValue={q}
              name="q"
              placeholder="Repair number, customer, phone…"
              required
            />
            <button className="btn-primary" aria-label="Search repairs">
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
              <Link
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-brand-50"
                href={`/admin/repairs/${repair.id}`}
                key={repair.id}
              >
                <div>
                  <p className="font-bold text-brand-600">{repair.repair_number}</p>
                  <p className="mt-1 text-sm">
                    {repair.customers?.full_name} · {repair.instrument}
                  </p>
                  <p className="mt-1 text-xs text-ink/45">
                    Received {formatDate(repair.received_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={repair.status} />
                  <ArrowRight size={17} />
                </div>
              </Link>
            ))}
            {!repairs.length && (
              <p className="p-8 text-center text-sm text-ink/50">
                No repairs found for “{q}”.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
