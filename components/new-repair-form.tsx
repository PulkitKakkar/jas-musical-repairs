"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createRepairAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { countryCodeOptions, formatDate, todayInputValue } from "@/lib/utils";
import type { Customer } from "@/lib/types";

type CustomerSuggestion = Customer & {
  repairs?: { received_date: string | null }[];
};

export function NewRepairForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [found, setFound] = useState(false);
  const [activeLookup, setActiveLookup] = useState<"name" | "phone" | null>(null);
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);

  const lookupValue = activeLookup === "name" ? name : activeLookup === "phone" ? phone : "";
  useEffect(() => {
    if (lookupValue.trim().length < 2 || found) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/admin/customer?q=${encodeURIComponent(lookupValue)}`, { signal: controller.signal });
      if (response.ok) {
        const result = await response.json();
        setSuggestions(result.customers ?? []);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lookupValue, found]);

  function loadCustomer(customer: Customer) {
    setName(customer.full_name);
    setPhone(customer.phone_number);
    setEmail(customer.email ?? "");
    setFound(true);
    setSuggestions([]);
    setActiveLookup(null);
    toast.info("Existing customer details loaded");
  }
  return (
    <form action={async (formData) => {
      const result = await createRepairAction(formData);
      if (result?.error) toast.error(result.error);
    }} className="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
      <div className="relative"><label className="label">Phone number</label><div className="flex gap-2"><select className="input max-w-36" name="phoneCountryCode" defaultValue="+44" aria-label="Phone country code">{countryCodeOptions.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select><input autoComplete="off" className="input" name="phoneNumber" type="tel" placeholder="Phone number" value={phone} onFocus={() => setActiveLookup("phone")} onChange={(e) => { setPhone(e.target.value); setFound(false); setActiveLookup("phone"); }} required /></div><CustomerSuggestions customers={activeLookup === "phone" ? suggestions : []} onSelect={loadCustomer} /><p className="mt-1 text-xs text-ink/45">UK is the default. Use the dropdown for international numbers or enter a full +number.</p>{found && <p className="mt-1 text-xs font-medium text-brand-600">Existing customer details loaded</p>}</div>
      <div className="relative"><label className="label">Customer name</label><input autoComplete="off" className="input" name="customerName" value={name} onFocus={() => setActiveLookup("name")} onChange={(e) => { setName(e.target.value); setFound(false); setActiveLookup("name"); }} required /><CustomerSuggestions customers={activeLookup === "name" ? suggestions : []} onSelect={loadCustomer} /></div>
      <div><label className="label">Email address</label><input className="input" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label">Alternate phone number</label><div className="flex gap-2"><select className="input max-w-36" name="alternatePhoneCountryCode" defaultValue="+44" aria-label="Alternate phone country code">{countryCodeOptions.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select><input className="input" name="alternatePhoneNumber" type="tel" placeholder="Optional number" /></div><p className="mt-1 text-xs text-ink/45">Optional contact number for this repair.</p></div>
      <div><label className="label">Instrument</label><input className="input" name="instrument" required /></div>
      <div className="sm:col-span-2"><label className="label">Issue description</label><textarea className="input min-h-28" name="issueDescription" required /></div>
      <div><label className="label">Amount (£)</label><input className="input" name="amount" type="number" min="0" step="0.01" required /></div>
      <div><label className="label">Payment status</label><select className="input" name="paymentStatus" defaultValue="UNPAID"><option value="UNPAID">Unpaid</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option></select></div>
      <div><label className="label">Intake date</label><input className="input" name="receivedDate" type="date" defaultValue={todayInputValue()} max={todayInputValue()} required /></div>
      <div className="sm:col-span-2"><label className="label">Internal notes</label><input className="input" name="notes" /></div>
      <div className="sm:col-span-2 flex justify-end"><SubmitButton>Create repair & notify customer</SubmitButton></div>
    </form>
  );
}

function CustomerSuggestions({ customers, onSelect }: { customers: CustomerSuggestion[]; onSelect: (customer: Customer) => void }) {
  if (!customers.length) return null;
  return (
    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto border border-black/10 bg-white shadow-xl">
      {customers.map((customer) => {
        const latestRepairDate = customer.repairs?.map((repair) => repair.received_date).filter(Boolean).sort().at(-1);
        return (
          <button className="block w-full border-b border-black/5 px-4 py-3 text-left hover:bg-brand-50" key={customer.id} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(customer)} type="button">
            <span className="block text-sm font-bold">{customer.full_name}</span>
            <span className="block text-xs text-ink/50">{customer.phone_number}{customer.email ? ` · ${customer.email}` : ""} · Last intake {formatDate(latestRepairDate)}</span>
          </button>
        );
      })}
    </div>
  );
}
