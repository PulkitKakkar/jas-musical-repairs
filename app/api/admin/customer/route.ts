import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const phone = new URL(request.url).searchParams.get("phone");
  if (!phone) return NextResponse.json({ customer: null });
  const { data } = await supabase.from("customers").select("*").eq("phone_number", phone).maybeSingle();
  return NextResponse.json({ customer: data });
}
