import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Repair } from "@/lib/types";

export function RepairTable({ repairs }: { repairs: Repair[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="border-b text-xs uppercase tracking-wider text-ink/40"><tr><th className="px-5 py-4">Repair number</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Phone</th><th className="px-5 py-4">Alt phone</th><th className="px-5 py-4">Instrument</th><th className="px-5 py-4">Price</th><th className="px-5 py-4">Payment</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Date</th></tr></thead>
        <tbody className="divide-y divide-black/5">{repairs.map((repair) => <tr key={repair.id} className={`transition ${repair.status === "CANCELLED" ? "bg-red-50/70" : "hover:bg-black/[0.02]"}`}><td className="px-5 py-4 font-bold"><Link className="text-brand-700 hover:underline" href={`/admin/repairs/${repair.id}`}>{repair.repair_number}</Link></td><td className="px-5 py-4">{repair.customers?.full_name}</td><td className="px-5 py-4">{repair.customers?.phone_number}</td><td className="px-5 py-4">{repair.alternate_phone_number ?? "—"}</td><td className="px-5 py-4">{repair.instrument}</td><td className="px-5 py-4">{formatMoney(repair.amount)}</td><td className="px-5 py-4"><PaymentStatusBadge status={repair.payment_status ?? "UNPAID"} /></td><td className="px-5 py-4"><StatusBadge status={repair.status} /></td><td className="px-5 py-4 text-ink/55">{formatDate(repair.received_date)}</td></tr>)}</tbody>
      </table>
      {!repairs.length && <p className="p-8 text-center text-sm text-ink/50">No repairs match these filters.</p>}
    </div>
  );
}
