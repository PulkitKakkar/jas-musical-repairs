"use client";

import { useState } from "react";
import { toast } from "sonner";

export function SmsTestForm() {
  const [pending, setPending] = useState(false);
  return <form className="flex gap-2" onSubmit={async (e) => {
    e.preventDefault(); setPending(true);
    const phoneNumber = new FormData(e.currentTarget).get("phoneNumber");
    const response = await fetch("/api/sms/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phoneNumber }) });
    const result = await response.json(); setPending(false);
    if (response.ok) toast.success(result.skipped ? "Twilio is not configured; SMS skipped" : "Test SMS sent");
    else toast.error(result.error);
  }}><input className="input" name="phoneNumber" type="tel" placeholder="+44 or 07…" required /><button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send test"}</button></form>;
}
