import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    has_public_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_public_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    has_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY, // true/false, no mostramos la clave
  });
}
