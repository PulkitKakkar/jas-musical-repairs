import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import type { Repair } from "@/lib/types";
import { tryNormalizeUkPhone } from "@/lib/utils";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("customers").select("*, repairs(id, repair_number, status)").order("created_at", { ascending: false });
  const customers = data ?? [];
  const normalizedPhoneQuery = tryNormalizeUkPhone(q);
  const filtered = customers.filter((c) => {
    const repairs = c.repairs as Repair[];
    return !q || c.full_name.toLowerCase().includes(q.toLowerCase()) || c.phone_number.includes(normalizedPhoneQuery ?? q) || repairs.some((r) => r.repair_number.toLowerCase().includes(q.toLowerCase()));
  });
  return <div className="mx-auto max-w-5xl"><div className="mb-7"><p className="text-sm font-semibold text-brand-600">Customer records</p><h1 className="text-3xl font-black">Search customers</h1></div>
    <form className="card mb-6 flex gap-2 p-3"><input className="input" name="q" defaultValue={q} placeholder="Name, phone number, or repair number" /><button className="btn-primary"><Search size={16} />Search</button></form>
    <div className="grid gap-4 sm:grid-cols-2">{filtered.map((customer) => <Link className="card p-5 transition hover:-translate-y-0.5 hover:border-brand-500" href={`/admin/customers/${customer.id}`} key={customer.id}><div className="flex items-start justify-between"><div><h2 className="font-bold">{customer.full_name}</h2><p className="mt-1 text-sm text-ink/50">{customer.phone_number}</p></div><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">{customer.repairs.length} repairs</span></div></Link>)}</div>
    {!filtered.length && <p className="py-16 text-center text-sm text-ink/50">No customers found.</p>}
  </div>;
}
