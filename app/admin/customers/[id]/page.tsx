import { notFound } from "next/navigation";
import { RepairTable } from "@/components/repair-table";
import { requireAdmin } from "@/lib/auth";
import type { Repair } from "@/lib/types";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("customers").select("*, repairs(*, customers(*))").eq("id", id).single();
  if (!data) notFound();
  const repairs = data.repairs as Repair[];
  const current = repairs.filter((r) => !["COLLECTED", "CANCELLED"].includes(r.status));
  const previous = repairs.filter((r) => ["COLLECTED", "CANCELLED"].includes(r.status));
  return <div className="mx-auto max-w-6xl"><div className="card mb-7 p-6"><p className="text-sm font-semibold text-brand-600">Customer profile</p><h1 className="text-3xl font-black">{data.full_name}</h1><p className="mt-2 text-sm text-ink/55">{data.phone_number} · {data.email || "No email"}</p></div>
    <History title="Current repairs" repairs={current} /><History title="Previous repairs" repairs={previous} />
  </div>;
}

function History({ title, repairs }: { title: string; repairs: Repair[] }) {
  return <section className="card mb-6"><h2 className="border-b px-5 py-4 font-bold">{title}</h2><RepairTable repairs={repairs} /></section>;
}
