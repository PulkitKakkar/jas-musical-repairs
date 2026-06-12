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
  if (rawPhone && !phone) return NextResponse.json({ error: "Enter a valid UK phone number", customer: null }, { status: 400 });
  if (!phone) return NextResponse.json({ customer: null });

  const { data } = await supabase.from("customers").select("*").eq("phone_number", phone).maybeSingle();
  return NextResponse.json({ customer: data });
}
