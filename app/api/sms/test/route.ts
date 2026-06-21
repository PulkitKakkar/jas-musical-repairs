import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/twilio";
import { tryNormalizePhone } from "@/lib/utils";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z.object({ phoneNumber: z.string().min(7), countryCode: z.string().optional() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  const phoneNumber = tryNormalizePhone(parsed.data.phoneNumber, parsed.data.countryCode ?? "+44");
  if (!phoneNumber) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });

  try {
    const result = await sendSms(phoneNumber, "JAS Musicals SMS test successful.");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SMS failed" },
      { status: 500 },
    );
  }
}
