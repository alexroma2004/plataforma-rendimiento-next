"use server";

import { isAppRole, type AppRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DeleteTeamInput = {
  teamId: string;
  confirmationName: string;
};

export type DeleteTeamResult =
  | {
      ok: true;
      deletedTeamId: string;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function validateInput(input: unknown): input is DeleteTeamInput {
  return (
    isRecord(input) &&
    isUuid(input.teamId) &&
    typeof input.confirmationName === "string" &&
    input.confirmationName.trim().length > 0
  );
}

export async function deleteTeamAction(
  input: DeleteTeamInput,
): Promise<DeleteTeamResult> {
  if (!validateInput(input)) {
    return {
      ok: false,
      error: "La solicitud de eliminación no es válida.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        error: "Debes iniciar sesión para eliminar un equipo.",
      };
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      return {
        ok: false,
        error: "No se pudieron comprobar tus permisos.",
      };
    }

    const role: AppRole = isAppRole(roleRow?.role) ? roleRow.role : "viewer";

    if (role !== "admin") {
      return {
        ok: false,
        error: "No tienes permisos para eliminar equipos.",
      };
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("id", input.teamId)
      .maybeSingle();

    if (teamError) {
      return {
        ok: false,
        error: "No se pudo comprobar el equipo seleccionado.",
      };
    }

    if (!team || typeof team.name !== "string") {
      return {
        ok: false,
        error: "El equipo seleccionado ya no existe.",
      };
    }

    if (input.confirmationName.trim() !== team.name.trim()) {
      return {
        ok: false,
        error: "El nombre de confirmación no coincide con el equipo.",
      };
    }

    const { data: deletedTeam, error: deleteError } = await supabase
      .from("teams")
      .delete()
      .eq("id", input.teamId)
      .select("id")
      .maybeSingle();

    if (deleteError || !deletedTeam) {
      return {
        ok: false,
        error: "No se pudo eliminar el equipo. Puede que ya no exista o no tengas permisos.",
      };
    }

    return {
      ok: true,
      deletedTeamId: input.teamId,
      message: `Equipo eliminado: ${team.name}.`,
    };
  } catch {
    return {
      ok: false,
      error: "No se pudo completar la eliminación del equipo.",
    };
  }
}
