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
  const [suggestions, setSuggestions] = useState<Customer[]>([]);

  function loadCustomer(customer: Customer) {
    setName(customer.full_name);
    setPhone(customer.phone_number);
    setEmail(customer.email ?? "");
    setFound(true);
    setSuggestions([]);
    toast.info("Existing customer details loaded");
  }

  async function lookup(type: "phone" | "name", value: string) {
    const minimum = type === "phone" ? 7 : 2;
    if (value.trim().length < minimum) return;
    const lookupValue = type === "phone" ? tryNormalizeUkPhone(value) : value.trim();
    if (!lookupValue) {
      toast.error("Enter a valid UK phone number");
      return;
    }
    if (type === "phone") setPhone(lookupValue);
    const response = await fetch(`/api/admin/customer?${type}=${encodeURIComponent(lookupValue)}`);
    const { customer, customers = [], error } = await response.json();
    if (!response.ok) {
      toast.error(error);
      return;
    }
    setSuggestions(type === "name" ? customers : []);
    setFound(Boolean(customer));
    if (customer) loadCustomer(customer);
  }
  return (
    <form action={async (formData) => {
      const result = await createRepairAction(formData);
      if (result?.error) toast.error(result.error);
    }} className="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
      <div><label className="label">Phone number</label><input className="input" name="phoneNumber" type="tel" placeholder="+44 or 07…" value={phone} onChange={(e) => { setPhone(e.target.value); setFound(false); }} onBlur={(e) => lookup("phone", e.target.value)} required /><p className="mt-1 text-xs text-ink/45">UK numbers are automatically saved in +44 format.</p>{found && <p className="mt-1 text-xs font-medium text-brand-600">Existing customer details loaded</p>}</div>
      <div className="relative"><label className="label">Customer name</label><input className="input" name="customerName" value={name} onChange={(e) => { const value = e.target.value; setName(value); setFound(false); if (value.trim().length >= 2) void lookup("name", value); else setSuggestions([]); }} required />{suggestions.length > 0 && <div className="absolute z-20 mt-1 w-full border border-black/15 bg-white shadow-xl">{suggestions.map((customer) => <button className="block w-full border-b border-black/10 px-3 py-2 text-left text-sm hover:bg-brand-50" key={customer.id} onClick={() => loadCustomer(customer)} type="button"><span className="font-bold">{customer.full_name}</span><span className="ml-2 text-xs text-ink/45">{customer.phone_number}</span></button>)}</div>}</div>
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
