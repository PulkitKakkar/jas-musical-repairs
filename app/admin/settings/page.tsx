import { CheckCircle2, CircleAlert, KeyRound } from "lucide-react";
import { SmsTestForm } from "@/components/sms-test-form";
import { isTwilioConfigured } from "@/lib/twilio";

export default function SettingsPage() {
  const configured = isTwilioConfigured();
  return <div className="mx-auto max-w-3xl"><div className="mb-7"><p className="text-sm font-semibold text-brand-600">Administration</p><h1 className="text-3xl font-black">SMS settings</h1></div>
    <section className="card mb-6 p-6"><div className="flex gap-4"><span className={`rounded-2xl p-3 ${configured ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"}`}>{configured ? <CheckCircle2 /> : <CircleAlert />}</span><div><h2 className="font-bold">Twilio {configured ? "configured" : "not configured"}</h2><p className="mt-1 text-sm leading-6 text-ink/55">Credentials are securely stored as Vercel environment variables. Auth tokens are never stored in the database or exposed to the browser.</p></div></div></section>
    <section className="card mb-6 p-6"><h2 className="mb-4 flex items-center gap-2 font-bold"><KeyRound size={18} />Required environment variables</h2><div className="space-y-2 font-mono text-sm text-ink/65"><p>TWILIO_ACCOUNT_SID</p><p>TWILIO_AUTH_TOKEN</p><p>TWILIO_PHONE_NUMBER</p></div></section>
    <section className="card p-6"><h2 className="mb-1 font-bold">Test SMS</h2><p className="mb-4 text-sm text-ink/50">Send a configuration test to an E.164-format number.</p><SmsTestForm /></section>
  </div>;
}
