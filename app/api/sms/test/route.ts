import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/twilio";
import { tryNormalizeUkPhone } from "@/lib/utils";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z.object({ phoneNumber: z.string().min(7) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  const phoneNumber = tryNormalizeUkPhone(parsed.data.phoneNumber);
  if (!phoneNumber) return NextResponse.json({ error: "Enter a valid UK phone number" }, { status: 400 });

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
