"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createRepairAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { todayInputValue, tryNormalizeUkPhone } from "@/lib/utils";
import type { Customer } from "@/lib/types";

export function NewRepairForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [found, setFound] = useState(false);

  function loadCustomer(customer: Customer) {
    setName(customer.full_name);
    setPhone(customer.phone_number);
    setEmail(customer.email ?? "");
    setFound(true);
    toast.info("Existing customer details loaded");
  }

  async function lookupPhone(value: string) {
    if (value.trim().length < 7) return;
    const lookupValue = tryNormalizeUkPhone(value);
    if (!lookupValue) {
      toast.error("Enter a valid UK phone number");
      return;
    }
    setPhone(lookupValue);
    const response = await fetch(`/api/admin/customer?phone=${encodeURIComponent(lookupValue)}`);
    const { customer, error } = await response.json();
    if (!response.ok) {
      toast.error(error);
      return;
    }
    setFound(Boolean(customer));
    if (customer) loadCustomer(customer);
  }
  return (
    <form action={async (formData) => {
      const result = await createRepairAction(formData);
      if (result?.error) toast.error(result.error);
    }} className="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
      <div><label className="label">Phone number</label><input className="input" name="phoneNumber" type="tel" placeholder="+44 or 07…" value={phone} onChange={(e) => { setPhone(e.target.value); setFound(false); }} onBlur={(e) => lookupPhone(e.target.value)} required /><p className="mt-1 text-xs text-ink/45">Existing customers are matched only by phone number. UK numbers are saved in +44 format.</p>{found && <p className="mt-1 text-xs font-medium text-brand-600">Existing customer details loaded</p>}</div>
      <div><label className="label">Customer name</label><input className="input" name="customerName" value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><label className="label">Email address</label><input className="input" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label">Instrument</label><input className="input" name="instrument" required /></div>
      <div className="sm:col-span-2"><label className="label">Issue description</label><textarea className="input min-h-28" name="issueDescription" required /></div>
      <div><label className="label">Amount (£)</label><input className="input" name="amount" type="number" min="0" step="0.01" required /></div>
      <div><label className="label">Intake date</label><input className="input" name="receivedDate" type="date" defaultValue={todayInputValue()} max={todayInputValue()} required /></div>
      <div className="sm:col-span-2"><label className="label">Internal notes</label><input className="input" name="notes" /></div>
      <div className="sm:col-span-2 flex justify-end"><SubmitButton>Create repair & notify customer</SubmitButton></div>
    </form>
  );
}
