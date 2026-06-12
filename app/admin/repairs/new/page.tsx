import { NewRepairForm } from "@/components/new-repair-form";

export default function NewRepairPage() {
  return <div className="mx-auto max-w-4xl"><div className="mb-7"><p className="text-sm font-semibold text-brand-600">Repair intake</p><h1 className="text-3xl font-black">Create new repair</h1><p className="mt-2 text-sm text-ink/50">Existing customers are matched automatically and exclusively by phone number.</p></div><NewRepairForm /></div>;
}
