import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Repair } from "@/lib/types";
import { formatMoney, tryNormalizeUkPhone } from "@/lib/utils";

type Suggestion = {
  value: string;
  label: string;
  detail: string;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().toLowerCase() ?? "";
  const scope = params.get("scope") ?? "repairs";
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  if (scope === "instruments") {
    const { data } = await supabase.from("repairs").select("instrument").order("instrument").limit(500);
    const suggestions = [...new Set((data ?? []).map((repair) => repair.instrument))]
      .filter((instrument) => instrument.toLowerCase().includes(query))
      .slice(0, 8)
      .map((instrument) => ({ value: instrument, label: instrument, detail: "Instrument" }));
    return NextResponse.json({ suggestions });
  }

  if (scope === "customers") {
    const { data } = await supabase
      .from("customers")
      .select("full_name, phone_number, repairs(repair_number)")
      .order("created_at", { ascending: false })
      .limit(500);
    const normalizedPhone = tryNormalizeUkPhone(query);
    const suggestions = (data ?? []).filter((customer) =>
      customer.full_name.toLowerCase().includes(query) ||
      customer.phone_number.includes(normalizedPhone ?? query) ||
      customer.repairs.some((repair) => repair.repair_number.toLowerCase().includes(query)),
    ).slice(0, 8).map((customer) => ({
      value: customer.full_name,
      label: customer.full_name,
      detail: `${customer.phone_number} · ${customer.repairs.length} repair${customer.repairs.length === 1 ? "" : "s"}`,
    }));
    return NextResponse.json({ suggestions });
  }

  const { data } = await supabase
    .from("repairs")
    .select("*, customers(*)")
    .order("received_date", { ascending: false })
    .limit(500);
  const normalizedPhone = tryNormalizeUkPhone(query);
  const suggestions = ((data ?? []) as Repair[]).filter((repair) =>
    repair.repair_number.toLowerCase().includes(query) ||
    repair.instrument.toLowerCase().includes(query) ||
    repair.customers?.full_name.toLowerCase().includes(query) ||
    repair.customers?.phone_number.includes(normalizedPhone ?? query),
  ).slice(0, 8).map<Suggestion>((repair) => ({
    value: repair.repair_number,
    label: `${repair.repair_number} · ${repair.customers?.full_name}`,
    detail: `${repair.instrument} · ${repair.status} · ${formatMoney(repair.amount)}`,
  }));
  return NextResponse.json({ suggestions });
}
