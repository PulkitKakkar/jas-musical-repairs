"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createHireAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import type { Customer, HirePaymentMethod } from "@/lib/types";
import { calculateHireAmounts, countryCodeOptions, formatDate, formatMoney, todayInputValue } from "@/lib/utils";

type CustomerSuggestion = Customer & {
  repairs?: { received_date: string | null }[];
};

export function NewHireForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [found, setFound] = useState(false);
  const [activeLookup, setActiveLookup] = useState<"name" | "phone" | null>(null);
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [hireCost, setHireCost] = useState("0");
  const [lateReturnDailyCharge, setLateReturnDailyCharge] = useState("0");
  const [securityDeposit, setSecurityDeposit] = useState("0");
  const [extraCharge, setExtraCharge] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<HirePaymentMethod>("CASH");

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

  const amounts = useMemo(() => calculateHireAmounts({
    hireCost: Number(hireCost) || 0,
    securityDeposit: Number(securityDeposit) || 0,
    extraCharge: Number(extraCharge) || 0,
    paymentMethod,
  }), [extraCharge, hireCost, paymentMethod, securityDeposit]);

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
      const result = await createHireAction(formData);
      if (result?.error) toast.error(result.error);
    }} className="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
      <div className="relative">
        <label className="label">Phone number</label>
        <div className="flex gap-2">
          <select className="input max-w-36" name="phoneCountryCode" defaultValue="+44" aria-label="Phone country code">
            {countryCodeOptions.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
          </select>
          <input autoComplete="off" className="input" name="phoneNumber" type="tel" placeholder="Phone number" value={phone} onFocus={() => setActiveLookup("phone")} onChange={(event) => { setPhone(event.target.value); setFound(false); setActiveLookup("phone"); }} required />
        </div>
        <CustomerSuggestions customers={activeLookup === "phone" ? suggestions : []} onSelect={loadCustomer} />
        {found && <p className="mt-1 text-xs font-medium text-brand-600">Existing customer details loaded</p>}
      </div>
      <div className="relative">
        <label className="label">Customer name</label>
        <input autoComplete="off" className="input" name="customerName" value={name} onFocus={() => setActiveLookup("name")} onChange={(event) => { setName(event.target.value); setFound(false); setActiveLookup("name"); }} required />
        <CustomerSuggestions customers={activeLookup === "name" ? suggestions : []} onSelect={loadCustomer} />
      </div>
      <div><label className="label">Email address</label><input className="input" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      <div><label className="label">Instrument</label><input className="input" name="instrument" required /></div>
      <div><label className="label">Hire date</label><input className="input" name="hireDate" type="date" defaultValue={todayInputValue()} required /></div>
      <div><label className="label">Instrument return date</label><input className="input" name="returnDueDate" type="date" defaultValue={todayInputValue()} required /></div>
      <div><label className="label">Hire cost before VAT (£)</label><input className="input" name="hireCost" type="number" min="0" step="0.01" value={hireCost} onChange={(event) => setHireCost(event.target.value)} required /></div>
      <div><label className="label">Late return charge per day (£)</label><input className="input" name="lateReturnDailyCharge" type="number" min="0" step="0.01" value={lateReturnDailyCharge} onChange={(event) => setLateReturnDailyCharge(event.target.value)} required /><p className="mt-1 text-xs text-ink/45">Shown in the customer hire message and used if the instrument is returned late.</p></div>
      <div><label className="label">Security deposit (£)</label><input className="input" name="securityDeposit" type="number" min="0" step="0.01" value={securityDeposit} onChange={(event) => setSecurityDeposit(event.target.value)} required /></div>
      <div><label className="label">Payment method</label><select className="input" name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as HirePaymentMethod)}><option value="CASH">Cash</option><option value="CARD">Card</option></select></div>
      <div><label className="label">Extra charge (£)</label><input className="input" name="extraCharge" type="number" min="0" step="0.01" value={extraCharge} onChange={(event) => setExtraCharge(event.target.value)} /></div>
      <div className="sm:col-span-2 grid gap-3 bg-cream p-4 text-sm sm:grid-cols-4">
        <Amount label="VAT on hire" value={amounts.hireVat} />
        <Amount label="Hire total" value={amounts.hireTotal} />
        <Amount label="Card fee" value={amounts.cardProcessingFee} />
        <Amount label="Return amount" value={amounts.returnAmount} strong />
      </div>
      <div className="sm:col-span-2"><label className="label">Internal notes</label><input className="input" name="notes" /></div>
      <div className="sm:col-span-2 flex justify-end"><SubmitButton>Create hire & send SMS</SubmitButton></div>
    </form>
  );
}

function Amount({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">{label}</p><p className={`mt-1 ${strong ? "text-xl font-bold" : "font-bold"}`}>{formatMoney(value)}</p></div>;
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
