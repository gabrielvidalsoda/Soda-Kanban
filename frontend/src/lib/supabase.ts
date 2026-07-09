import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for auth");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
