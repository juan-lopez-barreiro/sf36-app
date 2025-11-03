// src/app/api/admin/ping/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

    // Devuelve 3 filas recientes para inspeccionar
    const { data, error } = await supabase
      .from("assessments")
      .select("id,user_id,user_name,timestamp")
      .order("timestamp", { ascending: false })
      .limit(3);

    if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      projectUrl: url,          // útil para confirmar proyecto
      rowsFound: data?.length || 0,
      sample: data || [],
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}

