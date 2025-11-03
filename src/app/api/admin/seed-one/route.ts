// src/app/api/admin/seed-one/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
    const row = {
      user_id: "seed@test.local",
      user_name: "Seed From API",
      timestamp: new Date().toISOString(),
      answers: { PF: 80 },
      scores: { PF: { score: 80, n: 10 } },
      notes: "fila sembrada desde /api/admin/seed-one",
    };
    const { data, error } = await supabase.from("assessments").insert([row]).select("id");
    if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok:true, insertedId: data?.[0]?.id || null });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}
