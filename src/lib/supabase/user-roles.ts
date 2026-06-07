import { getSupabaseClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth/permissions";

export type UserRoleRow = {
  id: string;
  user_id: string;
  email: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

export async function getUserRolesFromSupabase() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("id, user_id, email, role, created_at, updated_at")
    .order("email", { ascending: true });

  if (error) {
    throw new Error(`No se han podido cargar los roles: ${error.message}`);
  }

  return (data ?? []) as UserRoleRow[];
}

export async function upsertUserRoleByEmail(email: string, role: AppRole) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("upsert_user_role_by_email", {
    target_email: email,
    target_role: role,
  });

  if (error) {
    throw new Error(`No se ha podido guardar el rol: ${error.message}`);
  }

  return data as UserRoleRow;
}