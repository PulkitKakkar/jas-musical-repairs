import Link from "next/link";
import { Home, LogOut, Plus, Search, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";

const links = [
  { href: "/admin", label: "Repairs home", icon: Home },
  { href: "/admin/repairs/new", label: "New repair", icon: Plus },
  { href: "/admin/customers", label: "Customers", icon: Search },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink p-5 text-white lg:flex">
        <Link href="/admin" className="mb-9 flex border-b border-white/15 pb-6"><BrandMark light compact /></Link>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/40">Repair administration</p>
        <nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-white/70 hover:border-brand-500 hover:bg-white/5 hover:text-white"><Icon size={18} />{label}</Link>)}</nav>
        <form action={logoutAction} className="mt-auto border-t border-white/15 pt-4"><button className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-white/60 hover:text-white"><LogOut size={18} />Sign out</button></form>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-white p-2 lg:hidden">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-w-16 flex-col items-center gap-1 rounded-lg p-2 text-[10px] font-semibold text-ink/60"><Icon size={18} />{label}</Link>)}</nav>
    </>
  );
}
