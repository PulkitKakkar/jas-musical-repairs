import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ customers: [] });

  const safeQuery = query.replace(/[%_]/g, "");
  const digits = query.replace(/\D/g, "");
  const phoneQueries = [
    query,
    digits ? `+${digits}` : "",
    digits.startsWith("0") ? `+44${digits.slice(1)}` : "",
    digits.startsWith("44") ? `+${digits}` : "",
  ].filter(Boolean);
  const [nameResult, phoneResult] = await Promise.all([
    supabase.from("customers").select("*, repairs(received_date)").ilike("full_name", `%${safeQuery}%`).limit(8),
    supabase.from("customers").select("*, repairs(received_date)").or(phoneQueries.map((phoneQuery) => `phone_number.ilike.%${phoneQuery}%`).join(",")).limit(8),
  ]);
  const customers = [...(nameResult.data ?? []), ...(phoneResult.data ?? [])]
    .filter((customer, index, all) => all.findIndex((item) => item.id === customer.id) === index)
    .slice(0, 8);
  return NextResponse.json({ customers });
}
