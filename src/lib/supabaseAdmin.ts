// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!; // ¡solo servidor!

// Este cliente usa la service role y debe usarse EXCLUSIVAMENTE en el servidor
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false },
});
