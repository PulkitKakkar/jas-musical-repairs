import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import type { Repair } from "@/lib/types";

export function RepairTable({ repairs }: { repairs: Repair[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b text-xs uppercase tracking-wider text-ink/40"><tr><th className="px-5 py-4">Repair number</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Instrument</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Date</th></tr></thead>
        <tbody className="divide-y divide-black/5">{repairs.map((repair) => <tr key={repair.id} className="transition hover:bg-black/[0.02]"><td className="px-5 py-4 font-bold"><Link className="text-brand-700 hover:underline" href={`/admin/repairs/${repair.id}`}>{repair.repair_number}</Link></td><td className="px-5 py-4">{repair.customers?.full_name}</td><td className="px-5 py-4">{repair.instrument}</td><td className="px-5 py-4"><StatusBadge status={repair.status} /></td><td className="px-5 py-4 text-ink/55">{formatDate(repair.received_date)}</td></tr>)}</tbody>
      </table>
      {!repairs.length && <p className="p-8 text-center text-sm text-ink/50">No repairs match these filters.</p>}
    </div>
  );
}
