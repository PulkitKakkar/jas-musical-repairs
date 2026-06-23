import { BarChart3, LockKeyhole } from "lucide-react";
import { reportLoginAction } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";
import { SubmitButton } from "@/components/submit-button";

export default async function ReportsLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-5">
      <div className="w-full max-w-md border-t-4 border-gold bg-cream p-7 shadow-2xl sm:p-9">
        <div className="mb-8 flex items-center justify-between border-b border-black/10 pb-6">
          <BrandMark compact />
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-ink/45"><BarChart3 size={14} />Master reports</p>
        </div>
        <h1 className="text-3xl font-normal">Reports login</h1>
        <p className="mb-7 mt-2 text-sm text-ink/55">Sign in with the separate master reports account.</p>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form action={reportLoginAction} className="space-y-4">
          <div><label className="label">Reports email</label><input className="input" name="email" type="email" required /></div>
          <div><label className="label">Reports password</label><input className="input" name="password" type="password" required /></div>
          <SubmitButton className="btn-primary w-full"><LockKeyhole size={16} />Open reports</SubmitButton>
        </form>
      </div>
    </main>
  );
}
