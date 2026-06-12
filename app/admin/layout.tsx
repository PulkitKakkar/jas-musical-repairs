import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div><AdminNav /><main className="min-h-screen px-4 pb-24 pt-6 sm:px-7 lg:ml-64 lg:px-10 lg:pb-10 lg:pt-9">{children}</main></div>;
}
