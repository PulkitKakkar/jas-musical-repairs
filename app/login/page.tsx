import { LockKeyhole } from "lucide-react";
import { loginAction } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-5">
      <div className="w-full max-w-md border-t-4 border-brand-600 bg-cream p-7 shadow-2xl sm:p-9">
        <div className="mb-8 flex items-center justify-between border-b border-black/10 pb-6"><BrandMark compact /><p className="text-xs uppercase tracking-widest text-ink/45">Repairs</p></div>
        <h1 className="text-3xl font-normal">Welcome back</h1>
        <p className="mb-7 mt-2 text-sm text-ink/55">Sign in with your Supabase admin account.</p>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form action={loginAction} className="space-y-4">
          <div><label className="label">Email</label><input className="input" name="email" type="email" required /></div>
          <div><label className="label">Password</label><input className="input" name="password" type="password" required /></div>
          <SubmitButton className="btn-primary w-full"><LockKeyhole size={16} />Sign in</SubmitButton>
        </form>
      </div>
    </main>
  );
}
