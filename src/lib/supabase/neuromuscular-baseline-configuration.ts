import {
  isIsoDate,
  type NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";
import type {
  NeuromuscularBaselineConfigurationEvent,
  NeuromuscularBaselineConfigurationMode,
} from "@/lib/domain/neuromuscular-baseline-configuration";

export const NEUROMUSCULAR_BASELINE_CONFIGURATION_EVENT_COLUMNS =
  "id, team_id, player_id, metric, mode, manual_value, effective_from, reason, created_at, created_by";

type NeuromuscularBaselineConfigurationEventRow = {
  id: string;
  team_id: string;
  player_id: string;
  metric: string;
  mode: string;
  manual_value: number | null;
  effective_from: string;
  reason: string | null;
  created_at: string;
  created_by: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getBaselineEventIdentifier(row: Record<string, unknown>): string | null {
  const value = row.id;

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getRequiredBaselineEventString(
  row: Record<string, unknown>,
  field: string,
  eventId: string | null,
): string {
  const value = row[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    const identifier = eventId ?? "desconocido";
    throw new Error(
      `Evento de configuración del baseline "${identifier}" inválido: ${field} debe ser un texto no vacío.`,
    );
  }

  return value;
}

function getBaselineEventManualValue(
  row: Record<string, unknown>,
  eventId: string,
): number | null {
  const value = row.manual_value;

  if (value === null) return null;

  if (typeof value !== "number") {
    throw new Error(
      `Evento de configuración del baseline "${eventId}" inválido: manual_value debe ser numérico o null.`,
    );
  }

  return value;
}

function getBaselineEventReason(
  row: Record<string, unknown>,
  eventId: string,
): string | null {
  const value = row.reason;

  if (value === null) return null;

  if (typeof value !== "string") {
    throw new Error(
      `Evento de configuración del baseline "${eventId}" inválido: reason debe ser texto o null.`,
    );
  }

  return value;
}

function parseBaselineConfigurationEventRow(
  value: unknown,
): NeuromuscularBaselineConfigurationEventRow {
  if (!isRecord(value)) {
    throw new Error(
      "Evento de configuración del baseline inválido: la fila remota no es un objeto.",
    );
  }

  const eventId = getBaselineEventIdentifier(value);
  const id = getRequiredBaselineEventString(value, "id", eventId);

  return {
    id,
    team_id: getRequiredBaselineEventString(value, "team_id", id),
    player_id: getRequiredBaselineEventString(value, "player_id", id),
    metric: getRequiredBaselineEventString(value, "metric", id),
    mode: getRequiredBaselineEventString(value, "mode", id),
    manual_value: getBaselineEventManualValue(value, id),
    effective_from: getRequiredBaselineEventString(value, "effective_from", id),
    reason: getBaselineEventReason(value, id),
    created_at: getRequiredBaselineEventString(value, "created_at", id),
    created_by: getRequiredBaselineEventString(value, "created_by", id),
  };
}

function isBaselineConfigurationMetric(
  value: string,
): value is NeuromuscularMetric {
  return value === "CMJ" || value === "RSIMOD" || value === "VMP";
}

function isBaselineConfigurationMode(
  value: string,
): value is NeuromuscularBaselineConfigurationMode {
  return value === "AUTOMATIC" || value === "MANUAL";
}

export function parseNeuromuscularBaselineConfigurationEventRow(
  value: unknown,
): NeuromuscularBaselineConfigurationEvent {
  const row = parseBaselineConfigurationEventRow(value);

  if (!isBaselineConfigurationMetric(row.metric)) {
    throw new Error(
      `Evento de configuración del baseline "${row.id}" inválido: métrica no compatible "${row.metric}".`,
    );
  }

  if (!isBaselineConfigurationMode(row.mode)) {
    throw new Error(
      `Evento de configuración del baseline "${row.id}" inválido: modo no compatible "${row.mode}".`,
    );
  }

  if (!isIsoDate(row.effective_from)) {
    throw new Error(
      `Evento de configuración del baseline "${row.id}" inválido: effective_from debe usar el formato ISO YYYY-MM-DD.`,
    );
  }

  if (row.mode === "MANUAL") {
    if (
      typeof row.manual_value !== "number" ||
      !Number.isFinite(row.manual_value) ||
      row.manual_value <= 0
    ) {
      throw new Error(
        `Evento de configuración del baseline "${row.id}" inválido: MANUAL exige manual_value finito y mayor que cero.`,
      );
    }
  } else if (row.manual_value !== null) {
    throw new Error(
      `Evento de configuración del baseline "${row.id}" inválido: AUTOMATIC exige manual_value null.`,
    );
  }

  return {
    id: row.id,
    teamId: row.team_id,
    playerId: row.player_id,
    metric: row.metric,
    mode: row.mode,
    manualValue: row.manual_value,
    effectiveFrom: row.effective_from,
    reason: row.reason,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
