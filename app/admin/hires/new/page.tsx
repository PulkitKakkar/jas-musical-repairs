import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewHireForm } from "@/components/new-hire-form";

export default function NewHirePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline" href="/admin/hires"><ArrowLeft size={16} />Back to hires</Link>
      <div className="mb-7 border-b border-black/10 pb-6">
        <p className="eyebrow">Instrument hire</p>
        <h1 className="mt-2 text-4xl font-normal">New hire</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/55">Create an instrument hire, calculate VAT and return amount, then send the hire SMS to the customer.</p>
      </div>
      <NewHireForm />
    </div>
  );
}
