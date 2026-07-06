import { getSupabaseClient } from "@/lib/supabase/client";

export type AdminTeamRow = {
  id: string;
  name: string;
  category: string | null;
  season: string | null;
  notes: string | null;
};

export type SaveAdminTeamInput = {
  id?: string;
  name: string;
  category?: string | null;
  season?: string | null;
  notes?: string | null;
};

const TEAM_SELECT = "id, name, category, season, notes";

function cleanText(value: string | null | undefined) {
  const text = String(value ?? "").trim();

  return text || null;
}

export async function getAdminTeamsFromSupabase() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_SELECT)
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No se han podido cargar los equipos: ${error.message}`);
  }

  return (data ?? []) as AdminTeamRow[];
}

export async function saveAdminTeamToSupabase(input: SaveAdminTeamInput) {
  const supabase = getSupabaseClient();
  const name = cleanText(input.name);

  if (!name) {
    throw new Error("El nombre del equipo es obligatorio.");
  }

  const payload = {
    name,
    category: cleanText(input.category),
    season: cleanText(input.season),
    notes: cleanText(input.notes),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("teams")
      .update(payload)
      .eq("id", input.id)
      .select(TEAM_SELECT)
      .single();

    if (error) {
      throw new Error(`No se ha podido actualizar el equipo: ${error.message}`);
    }

    return data as AdminTeamRow;
  }

  const { data, error } = await supabase
    .from("teams")
    .insert(payload)
    .select(TEAM_SELECT)
    .single();

  if (error) {
    throw new Error(`No se ha podido crear el equipo: ${error.message}`);
  }

  return data as AdminTeamRow;
}
