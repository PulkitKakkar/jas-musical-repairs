import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tryNormalizeUkPhone } from "@/lib/utils";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const rawPhone = params.get("phone")?.trim();
  const phone = rawPhone ? tryNormalizeUkPhone(rawPhone) : null;
  const name = params.get("name")?.trim();
  if (rawPhone && !phone) return NextResponse.json({ error: "Enter a valid UK phone number", customer: null }, { status: 400 });
  if (!phone && !name) return NextResponse.json({ customer: null });

  if (phone) {
    const { data } = await supabase.from("customers").select("*").eq("phone_number", phone).maybeSingle();
    return NextResponse.json({ customer: data, customers: data ? [data] : [] });
  }

  const { data = [] } = await supabase
    .from("customers")
    .select("*")
    .ilike("full_name", `%${name}%`)
    .order("full_name")
    .limit(6);
  const exact = data?.find((customer) => customer.full_name.toLowerCase() === name!.toLowerCase()) ?? null;
  return NextResponse.json({ customer: exact, customers: data ?? [] });
}
