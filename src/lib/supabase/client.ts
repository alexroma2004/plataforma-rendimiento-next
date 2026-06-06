import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createSupabaseClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  /*
    En navegador usamos createBrowserClient para que Supabase Auth pueda
    trabajar correctamente con cookies.

    En servidor usamos createClient normal para evitar problemas cuando algún
    archivo importa este módulo durante el build o renderizado server-side.
  */
  if (typeof window === "undefined") {
    return createSupabaseJsClient(
      supabaseUrl as string,
      supabaseAnonKey as string,
    );
  }

  return createBrowserClient(
    supabaseUrl as string,
    supabaseAnonKey as string,
  );
}

export const supabase = createSupabaseClient();

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.",
    );
  }

  return supabase;
}