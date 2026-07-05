import { getSupabaseClient } from "@/lib/supabase/client";
import type { DominantFoot, PlayerPosition } from "@/lib/domain/performance";

export type AdminPlayerProfileRow = {
  id: string;
  team_id: string | null;
  name: string;
  normalized_name: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  dominant_foot: DominantFoot | null;
  primary_position: PlayerPosition | null;
  secondary_position: PlayerPosition | null;
  position: string | null;
  shirt_number: number | null;
  is_goalkeeper: boolean | null;
  active: boolean | null;
  notes: string | null;
};

export type SaveAdminPlayerInput = {
  id?: string;
  first_name: string;
  last_name?: string | null;
  birth_date?: string | null;
  dominant_foot?: DominantFoot | null;
  primary_position?: PlayerPosition | null;
  secondary_position?: PlayerPosition | null;
  shirt_number?: number | null;
  active: boolean;
  notes?: string | null;
};

const PLAYER_SELECT = `
  id,
  team_id,
  name,
  normalized_name,
  first_name,
  last_name,
  birth_date,
  dominant_foot,
  primary_position,
  secondary_position,
  position,
  shirt_number,
  is_goalkeeper,
  active,
  notes
`;

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cleanText(value: string | null | undefined) {
  const text = String(value ?? "").trim();

  return text || null;
}

function buildFullName(firstName: string, lastName: string | null) {
  return [firstName, lastName].map(cleanText).filter(Boolean).join(" ");
}

function normalizeShirtNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isInteger(number) && number >= 0 ? number : null;
}

async function getDefaultTeamId() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("teams")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`No se ha podido cargar el equipo: ${error.message}`);
  }

  const teamId = data?.[0]?.id;

  if (!teamId) {
    throw new Error(
      "No hay ningún equipo creado en Supabase. Crea o confirma un equipo antes de añadir jugadores.",
    );
  }

  return teamId as string;
}

export async function getAdminPlayersFromSupabase() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No se han podido cargar los jugadores: ${error.message}`);
  }

  return (data ?? []) as AdminPlayerProfileRow[];
}

export async function saveAdminPlayerToSupabase(input: SaveAdminPlayerInput) {
  const supabase = getSupabaseClient();
  const firstName = cleanText(input.first_name);
  const lastName = cleanText(input.last_name);

  if (!firstName) {
    throw new Error("El nombre del jugador es obligatorio.");
  }

  const fullName = buildFullName(firstName, lastName);

  if (!fullName) {
    throw new Error("El nombre completo del jugador es obligatorio.");
  }

  const payload = {
    first_name: firstName,
    last_name: lastName,
    birth_date: cleanText(input.birth_date),
    dominant_foot: input.dominant_foot ?? null,
    primary_position: input.primary_position ?? null,
    secondary_position: input.secondary_position ?? null,
    shirt_number: normalizeShirtNumber(input.shirt_number),
    active: input.active,
    notes: cleanText(input.notes),

    name: fullName,
    normalized_name: normalizeName(fullName),
    position: input.primary_position ?? null,
    is_goalkeeper: input.primary_position === "PORTERO",
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("players")
      .update(payload)
      .eq("id", input.id)
      .select(PLAYER_SELECT)
      .single();

    if (error) {
      throw new Error(`No se ha podido actualizar el jugador: ${error.message}`);
    }

    return data as AdminPlayerProfileRow;
  }

  const teamId = await getDefaultTeamId();

  const { data, error } = await supabase
    .from("players")
    .insert({
      ...payload,
      team_id: teamId,
    })
    .select(PLAYER_SELECT)
    .single();

  if (error) {
    throw new Error(`No se ha podido crear el jugador: ${error.message}`);
  }

  return data as AdminPlayerProfileRow;
}
