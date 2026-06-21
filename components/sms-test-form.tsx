"use client";

import { useState } from "react";
import { toast } from "sonner";
import { countryCodeOptions } from "@/lib/utils";

export function SmsTestForm() {
  const [pending, setPending] = useState(false);
  return <form className="flex gap-2" onSubmit={async (e) => {
    e.preventDefault(); setPending(true);
    const phoneNumber = new FormData(e.currentTarget).get("phoneNumber");
    const countryCode = new FormData(e.currentTarget).get("countryCode");
    const response = await fetch("/api/sms/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phoneNumber, countryCode }) });
    const result = await response.json(); setPending(false);
    if (response.ok) toast.success(result.skipped ? "Twilio is not configured; SMS skipped" : "Test SMS sent");
    else toast.error(result.error);
  }}><select className="input max-w-40" name="countryCode" defaultValue="+44" aria-label="Country code">{countryCodeOptions.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select><input className="input" name="phoneNumber" type="tel" placeholder="Phone number" required /><button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send test"}</button></form>;
}
