"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createRepairAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { todayInputValue } from "@/lib/utils";

export function NewRepairForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [found, setFound] = useState(false);
  async function lookup(phone: string) {
    if (phone.length < 7) return;
    const response = await fetch(`/api/admin/customer?phone=${encodeURIComponent(phone)}`);
    const { customer } = await response.json();
    setFound(Boolean(customer));
    if (customer) { setName(customer.full_name); setEmail(customer.email ?? ""); toast.info("Existing customer loaded"); }
  }
  return (
    <form action={async (formData) => {
      const result = await createRepairAction(formData);
      if (result?.error) toast.error(result.error);
    }} className="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
      <div><label className="label">Phone number</label><input className="input" name="phoneNumber" type="tel" onBlur={(e) => lookup(e.target.value)} required />{found && <p className="mt-1 text-xs font-medium text-brand-600">Existing customer found</p>}</div>
      <div><label className="label">Customer name</label><input className="input" name="customerName" value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><label className="label">Email address</label><input className="input" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label">Instrument</label><input className="input" name="instrument" required /></div>
      <div className="sm:col-span-2"><label className="label">Issue description</label><textarea className="input min-h-28" name="issueDescription" required /></div>
      <div><label className="label">Amount (£)</label><input className="input" name="amount" type="number" min="0" step="0.01" required /></div>
      <div><label className="label">Intake date</label><input className="input" name="receivedDate" type="date" defaultValue={todayInputValue()} max={todayInputValue()} required /></div>
      <div className="sm:col-span-2"><label className="label">Internal notes</label><input className="input" name="notes" /></div>
      <div className="sm:col-span-2 flex justify-end"><SubmitButton>Create repair & send SMS</SubmitButton></div>
    </form>
  );
}
