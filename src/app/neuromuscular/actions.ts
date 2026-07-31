"use server";

import {
  isAppRole,
  type AppRole,
} from "@/lib/auth/permissions";
import {
  isIsoDate,
  type NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";
import type {
  NeuromuscularBaselineConfigurationEvent,
  NeuromuscularBaselineConfigurationMode,
} from "@/lib/domain/neuromuscular-baseline-configuration";
import {
  NEUROMUSCULAR_BASELINE_CONFIGURATION_EVENT_COLUMNS,
  parseNeuromuscularBaselineConfigurationEventRow,
} from "@/lib/supabase/neuromuscular-baseline-configuration";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateNeuromuscularBaselineConfigurationEventInput = {
  playerId: string;
  metric: NeuromuscularMetric;
  mode: NeuromuscularBaselineConfigurationMode;
  manualValue: number | null;
  effectiveFrom: string;
  reason: string | null;
};

type CreateBaselineConfigurationEventField =
  | "playerId"
  | "metric"
  | "mode"
  | "manualValue"
  | "effectiveFrom"
  | "reason";

type CreateBaselineConfigurationEventFieldErrors = Partial<
  Record<CreateBaselineConfigurationEventField, string>
>;

export type CreateBaselineConfigurationEventResult =
  | {
      success: true;
      event: NeuromuscularBaselineConfigurationEvent;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: CreateBaselineConfigurationEventFieldErrors;
    };

type ValidatedInput = CreateNeuromuscularBaselineConfigurationEventInput;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBaselineConfigurationMetric(
  value: unknown,
): value is NeuromuscularMetric {
  return value === "CMJ" || value === "RSIMOD" || value === "VMP";
}

function isBaselineConfigurationMode(
  value: unknown,
): value is NeuromuscularBaselineConfigurationMode {
  return value === "AUTOMATIC" || value === "MANUAL";
}

function isValidManualValue(
  mode: NeuromuscularBaselineConfigurationMode,
  value: unknown,
): value is number | null {
  if (mode === "AUTOMATIC") {
    return value === null;
  }

  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function trimPostgresDefaultSpaces(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value.charCodeAt(start) === 0x20) {
    start += 1;
  }

  while (end > start && value.charCodeAt(end - 1) === 0x20) {
    end -= 1;
  }

  return value.slice(start, end);
}

function getPostgresCharacterLength(value: string): number {
  return Array.from(value).length;
}

function getPostgresTrimmedCharacterLength(value: string): number {
  return getPostgresCharacterLength(trimPostgresDefaultSpaces(value));
}

function isValidReason(value: unknown): value is string | null {
  if (value === null) return true;

  if (typeof value !== "string") return false;

  const length = getPostgresTrimmedCharacterLength(value);

  return length >= 1 && length <= 500;
}

function getCurrentMadridCivilDate(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateParts = new Map(
    parts
      .filter(({ type }) => type === "year" || type === "month" || type === "day")
      .map(({ type, value }) => [type, value]),
  );
  const year = dateParts.get("year");
  const month = dateParts.get("month");
  const day = dateParts.get("day");

  if (!year || !month || !day) {
    throw new Error("No se pudieron obtener todas las partes de la fecha.");
  }

  const civilDate = `${year}-${month}-${day}`;

  if (!isIsoDate(civilDate)) {
    throw new Error("La fecha civil de Madrid no es válida.");
  }

  return civilDate;
}

function validateInput(
  input: unknown,
):
  | { valid: true; value: ValidatedInput }
  | {
      valid: false;
      fieldErrors?: CreateBaselineConfigurationEventFieldErrors;
    } {
  if (!isRecord(input)) {
    return { valid: false };
  }

  const fieldErrors: CreateBaselineConfigurationEventFieldErrors = {};
  const playerId = input.playerId;
  const metric = input.metric;
  const mode = input.mode;
  const manualValue = input.manualValue;
  const effectiveFrom = input.effectiveFrom;
  const reason = input.reason;

  if (!isNonEmptyString(playerId)) {
    fieldErrors.playerId = "Selecciona un jugador válido.";
  }

  if (!isBaselineConfigurationMetric(metric)) {
    fieldErrors.metric = "Selecciona una métrica válida.";
  }

  if (!isBaselineConfigurationMode(mode)) {
    fieldErrors.mode = "Selecciona un modo de baseline válido.";
  }

  if (mode === "MANUAL") {
    if (
      typeof manualValue !== "number" ||
      !Number.isFinite(manualValue) ||
      manualValue <= 0
    ) {
      fieldErrors.manualValue =
        "El valor manual debe ser un número finito mayor que cero.";
    }
  } else if (mode === "AUTOMATIC" && manualValue !== null) {
    fieldErrors.manualValue = "El modo automático no admite un valor manual.";
  }

  if (typeof effectiveFrom !== "string" || !isIsoDate(effectiveFrom)) {
    fieldErrors.effectiveFrom = "La fecha efectiva no es válida.";
  }

  if (reason !== null && typeof reason !== "string") {
    fieldErrors.reason = "El motivo no es válido.";
  } else if (typeof reason === "string") {
    const reasonLength = getPostgresTrimmedCharacterLength(reason);

    if (reasonLength === 0) {
      fieldErrors.reason =
        "El motivo debe contener al menos un carácter distinto de un espacio.";
    } else if (reasonLength > 500) {
      fieldErrors.reason = "El motivo no puede superar los 500 caracteres.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  if (
    !isNonEmptyString(playerId) ||
    !isBaselineConfigurationMetric(metric) ||
    !isBaselineConfigurationMode(mode) ||
    !isValidManualValue(mode, manualValue) ||
    typeof effectiveFrom !== "string" ||
    !isIsoDate(effectiveFrom) ||
    !isValidReason(reason)
  ) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    value: {
      playerId,
      metric,
      mode,
      manualValue,
      effectiveFrom,
      reason,
    },
  };
}

function getInsertErrorMessage(errorCode: string | undefined): string {
  if (errorCode === "42501") {
    return "No tienes permisos para guardar esta configuración de baseline.";
  }

  if (
    errorCode === "23514" ||
    errorCode === "23502" ||
    errorCode === "22P02"
  ) {
    return "La configuración no cumple las reglas requeridas.";
  }

  if (errorCode === "23503") {
    return "El jugador, equipo o usuario asociado ya no está disponible.";
  }

  return "No se pudo guardar la configuración del baseline.";
}

export async function createNeuromuscularBaselineConfigurationEvent(
  input: CreateNeuromuscularBaselineConfigurationEventInput,
): Promise<CreateBaselineConfigurationEventResult> {
  if (!isRecord(input)) {
    return {
      success: false,
      error: "La solicitud de configuración del baseline no es válida.",
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
        success: false,
        error: "Debes iniciar sesión para configurar el baseline.",
      };
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      return {
        success: false,
        error: "No se pudieron comprobar tus permisos.",
      };
    }

    const role: AppRole = isAppRole(roleRow?.role) ? roleRow.role : "viewer";

    if (role === "viewer") {
      return {
        success: false,
        error: "No tienes permisos para crear configuraciones de baseline.",
      };
    }

    const inputValidation = validateInput(input);

    if (!inputValidation.valid) {
      return {
        success: false,
        error: "Revisa los datos de la configuración.",
        fieldErrors: inputValidation.fieldErrors,
      };
    }

    const validatedInput = inputValidation.value;
    let todayMadrid: string;

    try {
      todayMadrid = getCurrentMadridCivilDate();
    } catch {
      return {
        success: false,
        error: "No se pudo comprobar la fecha efectiva.",
      };
    }

    const isRetroactive = validatedInput.effectiveFrom < todayMadrid;

    if (role === "staff" && isRetroactive) {
      return {
        success: false,
        error: "El personal staff no puede crear configuraciones retroactivas.",
        fieldErrors: {
          effectiveFrom:
            "El personal staff no puede crear configuraciones retroactivas.",
        },
      };
    }

    if (
      role === "admin" &&
      isRetroactive &&
      validatedInput.reason === null
    ) {
      return {
        success: false,
        error: "Debes indicar un motivo para una configuración retroactiva.",
        fieldErrors: {
          reason:
            "Debes indicar un motivo para una configuración retroactiva.",
        },
      };
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, team_id")
      .eq("id", validatedInput.playerId)
      .maybeSingle();

    if (playerError) {
      return {
        success: false,
        error: "No se pudo comprobar el jugador seleccionado.",
      };
    }

    if (player === null) {
      return {
        success: false,
        error: "El jugador seleccionado no existe.",
      };
    }

    if (
      !isRecord(player) ||
      !isNonEmptyString(player.id) ||
      player.id !== validatedInput.playerId
    ) {
      return {
        success: false,
        error: "No se pudo comprobar el jugador seleccionado.",
      };
    }

    if (!isNonEmptyString(player.team_id)) {
      return {
        success: false,
        error: "El jugador no está asociado a ningún equipo.",
      };
    }

    const teamId = player.team_id;
    const { data: createdRow, error: insertError } = await supabase
      .from("neuromuscular_baseline_configuration_events")
      .insert({
        team_id: teamId,
        player_id: validatedInput.playerId,
        metric: validatedInput.metric,
        mode: validatedInput.mode,
        manual_value: validatedInput.manualValue,
        effective_from: validatedInput.effectiveFrom,
        reason: validatedInput.reason,
        created_by: user.id,
      })
      .select(NEUROMUSCULAR_BASELINE_CONFIGURATION_EVENT_COLUMNS)
      .single();

    if (insertError) {
      return {
        success: false,
        error: getInsertErrorMessage(insertError.code),
      };
    }

    if (!createdRow) {
      return {
        success: false,
        error: "No se pudo guardar la configuración del baseline.",
      };
    }

    try {
      return {
        success: true,
        event: parseNeuromuscularBaselineConfigurationEventRow(createdRow),
      };
    } catch {
      return {
        success: false,
        error:
          "La configuración se guardó, pero no se pudo interpretar la respuesta.",
      };
    }
  } catch {
    return {
      success: false,
      error: "No se pudo completar la configuración del baseline.",
    };
  }
}
