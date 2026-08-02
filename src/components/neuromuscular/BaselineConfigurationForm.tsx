"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { createNeuromuscularBaselineConfigurationEvent } from "@/app/neuromuscular/actions";
import StatusMessage from "@/components/ui/StatusMessage";
import type { AppRole } from "@/lib/auth/permissions";
import { isIsoDate, type NeuromuscularMetric } from "@/lib/domain/neuromuscular";
import type {
  NeuromuscularBaselineConfigurationEvent,
  NeuromuscularBaselineConfigurationMode,
} from "@/lib/domain/neuromuscular-baseline-configuration";

type BaselineConfigurationFormProps = {
  playerId: string;
  playerName: string;
  metric: NeuromuscularMetric;
  role: AppRole;
  onClose: () => void;
  onCreated: (event: NeuromuscularBaselineConfigurationEvent) => Promise<void>;
};

type FieldName = "effectiveFrom" | "mode" | "manualValue" | "reason";
type FieldErrors = Partial<Record<FieldName, string>>;

function getMadridCivilDate(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(
    parts
      .filter(({ type }) => type === "year" || type === "month" || type === "day")
      .map(({ type, value }) => [type, value]),
  );
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (!year || !month || !day) {
    throw new Error("No se pudo obtener la fecha civil de Madrid.");
  }

  return `${year}-${month}-${day}`;
}

function getMetricLabel(metric: NeuromuscularMetric): string {
  return metric === "RSIMOD" ? "RSI modificado" : metric;
}

function getMetricUnit(metric: NeuromuscularMetric): string {
  if (metric === "CMJ") return "cm";
  if (metric === "RSIMOD") return "ratio";
  return "m/s";
}

function parsePositiveDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");

  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

export default function BaselineConfigurationForm({
  playerId,
  playerName,
  metric,
  role,
  onClose,
  onCreated,
}: BaselineConfigurationFormProps) {
  const formId = useId();
  const todayMadrid = useMemo(() => getMadridCivilDate(), []);
  const mountedRef = useRef(true);
  const [mode, setMode] =
    useState<NeuromuscularBaselineConfigurationMode>("AUTOMATIC");
  const [effectiveFrom, setEffectiveFrom] = useState(todayMadrid);
  const [manualValueInput, setManualValueInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isRetroactive = isIsoDate(effectiveFrom) && effectiveFrom < todayMadrid;
  const modeId = `${formId}-mode`;
  const dateId = `${formId}-effective-from`;
  const manualValueId = `${formId}-manual-value`;
  const reasonId = `${formId}-reason`;
  const automaticHelpId = `${formId}-automatic-help`;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => {
      if (!current[field]) return current;

      const remaining = { ...current };
      delete remaining[field];
      return remaining;
    });
  }

  function handleModeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextMode = event.target.value;

    if (nextMode !== "AUTOMATIC" && nextMode !== "MANUAL") return;

    setMode(nextMode);
    clearFieldError("mode");

    if (nextMode === "AUTOMATIC") {
      setManualValueInput("");
      clearFieldError("manualValue");
    }
  }

  function validate(): { manualValue: number | null; reason: string | null } | null {
    const nextErrors: FieldErrors = {};
    const parsedManualValue =
      mode === "MANUAL" ? parsePositiveDecimal(manualValueInput) : null;
    let parsedReason: string | null = null;

    if (!playerId) {
      nextErrors.mode = "No se ha podido identificar el jugador seleccionado.";
    }

    if (!isIsoDate(effectiveFrom)) {
      nextErrors.effectiveFrom = "Introduce una fecha válida en formato YYYY-MM-DD.";
    } else if (role === "staff" && effectiveFrom < todayMadrid) {
      nextErrors.effectiveFrom =
        "El personal staff no puede crear configuraciones retroactivas.";
    }

    if (mode === "MANUAL" && parsedManualValue === null) {
      nextErrors.manualValue = "Introduce un valor manual numérico mayor que cero.";
    }

    if (reasonInput !== "") {
      const trimmedReason = trimPostgresDefaultSpaces(reasonInput);
      const reasonLength = getPostgresCharacterLength(trimmedReason);

      if (reasonLength === 0) {
        nextErrors.reason =
          "El motivo debe contener al menos un carácter distinto de un espacio.";
      } else if (reasonLength > 500) {
        nextErrors.reason = "El motivo no puede superar los 500 caracteres.";
      } else {
        parsedReason = reasonInput;
      }
    }

    if (role === "admin" && isRetroactive && parsedReason === null) {
      nextErrors.reason =
        "Debes indicar un motivo para una configuración retroactiva.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    return { manualValue: parsedManualValue, reason: parsedReason };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setMessage(null);
    const validated = validate();
    if (!validated) return;

    setSaving(true);

    try {
      const result = await createNeuromuscularBaselineConfigurationEvent({
        playerId,
        metric,
        mode,
        manualValue: validated.manualValue,
        effectiveFrom,
        reason: validated.reason,
      });

      if (!mountedRef.current) return;

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage(result.error);
        return;
      }

      try {
        await onCreated(result.event);
      } catch {
        if (mountedRef.current) {
          setMessage(
            "La configuración pudo guardarse, pero no se pudo actualizar la vista.",
          );
        }
      }
    } catch {
      if (mountedRef.current) {
        setMessage("No se pudo guardar la configuración del baseline.");
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-950">
            Configurar baseline
          </h3>
          <p className="text-sm text-slate-600">
            Referencia de {getMetricLabel(metric)} para {playerName}.
          </p>
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Métrica: {getMetricLabel(metric)}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={modeId} className="text-sm font-bold text-slate-700">
            Modo
          </label>
          <select
            id={modeId}
            value={mode}
            disabled={saving}
            onChange={handleModeChange}
            aria-invalid={Boolean(fieldErrors.mode)}
            aria-describedby={
              [
                mode === "AUTOMATIC" ? automaticHelpId : null,
                fieldErrors.mode ? `${modeId}-error` : null,
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="AUTOMATIC">Automático</option>
            <option value="MANUAL">Manual</option>
          </select>
          {fieldErrors.mode && (
            <p id={`${modeId}-error`} role="alert" className="mt-1 text-xs text-red-700">
              {fieldErrors.mode}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={dateId} className="text-sm font-bold text-slate-700">
            Fecha efectiva
          </label>
          <input
            id={dateId}
            type="date"
            value={effectiveFrom}
            min={role === "staff" ? todayMadrid : undefined}
            disabled={saving}
            onChange={(event) => {
              setEffectiveFrom(event.target.value);
              clearFieldError("effectiveFrom");
            }}
            aria-invalid={Boolean(fieldErrors.effectiveFrom)}
            aria-describedby={fieldErrors.effectiveFrom ? `${dateId}-error` : undefined}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          {fieldErrors.effectiveFrom && (
            <p id={`${dateId}-error`} role="alert" className="mt-1 text-xs text-red-700">
              {fieldErrors.effectiveFrom}
            </p>
          )}
        </div>

        {mode === "MANUAL" && (
          <div>
            <label htmlFor={manualValueId} className="text-sm font-bold text-slate-700">
              Valor manual ({getMetricUnit(metric)})
            </label>
            <input
              id={manualValueId}
              type="text"
              inputMode="decimal"
              value={manualValueInput}
              disabled={saving}
              onChange={(event) => {
                setManualValueInput(event.target.value);
                clearFieldError("manualValue");
              }}
              aria-invalid={Boolean(fieldErrors.manualValue)}
              aria-describedby={fieldErrors.manualValue ? `${manualValueId}-error` : undefined}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            {fieldErrors.manualValue && (
              <p id={`${manualValueId}-error`} role="alert" className="mt-1 text-xs text-red-700">
                {fieldErrors.manualValue}
              </p>
            )}
          </div>
        )}
      </div>

      {mode === "AUTOMATIC" && (
        <p id={automaticHelpId} className="mt-4 text-sm text-slate-600">
          Se creará un nuevo evento que devolverá esta métrica al baseline automático
          desde la fecha indicada. Las configuraciones anteriores no se eliminarán.
        </p>
      )}

      {role === "admin" && isRetroactive && (
        <div className="mt-4">
          <StatusMessage variant="warning" title="Configuración retroactiva">
            Esta configuración es retroactiva y puede recalcular comparaciones, loss y
            readiness desde la fecha indicada hasta que entre en vigor otra configuración
            posterior. Debes indicar un motivo.
          </StatusMessage>
        </div>
      )}

      <div className="mt-4">
        <label htmlFor={reasonId} className="text-sm font-bold text-slate-700">
          Motivo {role === "admin" && isRetroactive ? "(obligatorio)" : "(opcional)"}
        </label>
        <textarea
          id={reasonId}
          value={reasonInput}
          disabled={saving}
          onChange={(event) => {
            setReasonInput(event.target.value);
            clearFieldError("reason");
          }}
          aria-invalid={Boolean(fieldErrors.reason)}
          aria-describedby={fieldErrors.reason ? `${reasonId}-error` : undefined}
          rows={3}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        {fieldErrors.reason && (
          <p id={`${reasonId}-error`} role="alert" className="mt-1 text-xs text-red-700">
            {fieldErrors.reason}
          </p>
        )}
      </div>

      {message && (
        <div className="mt-4">
          <StatusMessage variant="error">{message}</StatusMessage>
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}
