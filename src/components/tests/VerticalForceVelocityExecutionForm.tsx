"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import StatusMessage from "@/components/ui/StatusMessage";
import {
  createVerticalForceVelocitySummary,
  VERTICAL_FORCE_VELOCITY_DEVICE,
  VERTICAL_FORCE_VELOCITY_MAX_CONDITIONS,
  VERTICAL_FORCE_VELOCITY_MIN_CONDITIONS,
  VERTICAL_FORCE_VELOCITY_PROTOCOL,
  type VerticalForceVelocityFormState,
  type VerticalForceVelocitySummary,
  type VerticalForceVelocityValidationErrors,
  validateVerticalForceVelocityForm,
} from "@/lib/domain/tests/vertical-force-velocity";
import {
  isTestExecutionContextComplete,
  type TestExecutionContext,
} from "@/lib/domain/test-execution";

type VerticalForceVelocityExecutionFormProps = {
  context: TestExecutionContext | null;
  hasSelectedPlayer: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onReview: (performedAt: string) => void;
  onReturnToExecution: () => void;
  onSave: (
    form: VerticalForceVelocityFormState,
    summary: VerticalForceVelocitySummary,
  ) => void;
};

type HeightIndex = 0 | 1 | 2;

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100";

const createCondition = () => ({
  externalLoadKg: "",
  jumpHeightsCm: ["", "", ""] as [string, string, string],
});

const createInitialForm = (): VerticalForceVelocityFormState => ({
  performedAt: new Date().toISOString().slice(0, 10),
  bodyMassKg: "",
  pushOffDistanceCm: "",
  conditions: [
    createCondition(),
    createCondition(),
    createCondition(),
    createCondition(),
  ],
  observations: "",
});

const formatNumber = (value: number | null, decimals = 2) => {
  if (value === null || !Number.isFinite(value)) return "—";

  return value.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatR2 = (value: number | null) =>
  value === null ? "No definido" : formatNumber(value, 3);

function ProfileSummary({ summary }: { summary: VerticalForceVelocitySummary }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Detail title="Condiciones" value={String(summary.conditions.length)} />
      <Detail title="Peso corporal" value={`${formatNumber(summary.bodyMassKg)} kg`} />
      <Detail title="hPO" value={`${formatNumber(summary.pushOffDistanceCm)} cm`} />
      <Detail title="F0" value={`${formatNumber(summary.f0N)} N`} />
      <Detail title="F0 relativa" value={`${formatNumber(summary.f0Relative)} N/kg`} />
      <Detail title="V0" value={`${formatNumber(summary.v0Ms, 3)} m/s`} />
      <Detail title="Pendiente Sfv" value={`${formatNumber(summary.slope, 3)} N·s/m`} />
      <Detail title="Pendiente relativa" value={`${formatNumber(summary.slopeRelative, 3)} N·s/(m·kg)`} />
      <Detail title="Pmax" value={`${formatNumber(summary.pmaxW)} W`} />
      <Detail title="Pmax relativa" value={`${formatNumber(summary.pmaxRelative)} W/kg`} />
      <Detail title="R²" value={formatR2(summary.r2)} />
      <Detail
        title="Ecuación"
        value={
          summary.slope === null || summary.intercept === null
            ? "—"
            : `F = ${formatNumber(summary.slope, 3)} · V + ${formatNumber(summary.intercept)} `
        }
      />
    </div>
  );
}

function Detail({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function ConditionsTable({ summary }: { summary: VerticalForceVelocitySummary }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="min-w-[960px] w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-2 py-2">Carga ext.</th>
            <th className="px-2 py-2">Masa sistema</th>
            <th className="px-2 py-2">Salto 1</th>
            <th className="px-2 py-2">Salto 2</th>
            <th className="px-2 py-2">Salto 3</th>
            <th className="px-2 py-2">Mejor altura</th>
            <th className="px-2 py-2">Fuerza media</th>
            <th className="px-2 py-2">Velocidad media</th>
            <th className="px-2 py-2">Potencia media</th>
          </tr>
        </thead>
        <tbody>
          {summary.conditions.map((condition) => (
            <tr key={condition.index} className="border-b border-slate-100">
              <td className="px-2 py-2">{formatNumber(condition.externalLoadKg)} kg</td>
              <td className="px-2 py-2">{formatNumber(condition.systemMassKg)} kg</td>
              <td className="px-2 py-2">{formatNumber(condition.jumpHeightsCm[0])} cm</td>
              <td className="px-2 py-2">{formatNumber(condition.jumpHeightsCm[1])} cm</td>
              <td className="px-2 py-2">{formatNumber(condition.jumpHeightsCm[2])} cm</td>
              <td className="px-2 py-2">{formatNumber(condition.bestHeightCm)} cm</td>
              <td className="px-2 py-2">{formatNumber(condition.meanForceN)} N</td>
              <td className="px-2 py-2">{formatNumber(condition.meanVelocityMs, 3)} m/s</td>
              <td className="px-2 py-2">{formatNumber(condition.meanPowerW)} W</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfileChart({ summary }: { summary: VerticalForceVelocitySummary }) {
  const points = summary.conditions.map((condition) => ({
    velocity: condition.meanVelocityMs,
    force: condition.meanForceN,
  }));
  const profileIsValid =
    summary.mathematicalError === null &&
    summary.slope !== null &&
    summary.intercept !== null &&
    summary.f0N !== null &&
    summary.v0Ms !== null;
  const f0ForChart = profileIsValid ? summary.f0N ?? 0 : 0;
  const v0ForChart = profileIsValid ? summary.v0Ms ?? 0 : 0;
  const regression = profileIsValid
    ? [
        { velocity: 0, fit: f0ForChart },
        { velocity: v0ForChart, fit: 0 },
      ]
    : [];
  const maximumVelocity = Math.max(
    ...points.map((point) => point.velocity),
    v0ForChart,
  );
  const maximumForce = Math.max(
    ...points.map((point) => point.force),
    f0ForChart,
  );

  if (points.length === 0 || !Number.isFinite(maximumVelocity) || !Number.isFinite(maximumForce)) {
    return null;
  }

  return (
    <div className="mt-5 h-72">
      <ResponsiveContainer>
        <LineChart data={regression}>
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="velocity"
            domain={[0, maximumVelocity * 1.08]}
            tickFormatter={(value) => `${Number(value).toFixed(2)} m/s`}
          />
          <YAxis
            type="number"
            domain={[0, maximumForce * 1.08]}
            tickFormatter={(value) => `${Number(value).toFixed(0)} N`}
          />
          <Tooltip />
          <Scatter data={points} dataKey="force" fill="#1d4ed8" name="Condición" />
          {profileIsValid && (
            <>
              <Scatter
                data={[
                  { velocity: 0, force: f0ForChart },
                  { velocity: v0ForChart, force: 0 },
                ]}
                dataKey="force"
                fill="#16a34a"
                name="Puntos teóricos"
              />
              <Line dataKey="fit" stroke="#0f172a" dot={false} name="Regresión" />
              <ReferenceLine
                x={0}
                stroke="#16a34a"
                label={{ value: "F0", position: "insideTopLeft", fill: "#166534" }}
              />
              <ReferenceLine
                y={0}
                stroke="#dc2626"
                label={{ value: "V0", position: "insideBottomRight", fill: "#991b1b" }}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function VerticalForceVelocityExecutionForm({
  context,
  hasSelectedPlayer,
  isSaving,
  onBack,
  onCancel,
  onReview,
  onReturnToExecution,
  onSave,
}: VerticalForceVelocityExecutionFormProps) {
  const [form, setForm] = useState(createInitialForm);
  const [errors, setErrors] = useState<VerticalForceVelocityValidationErrors>({
    conditions: [],
  });
  const [contextError, setContextError] = useState<string | null>(null);
  const [isReview, setIsReview] = useState(false);
  const summary = useMemo(
    () => createVerticalForceVelocitySummary(form),
    [form],
  );

  const updateCondition = (
    index: number,
    field: "externalLoadKg" | HeightIndex,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      conditions: current.conditions.map((condition, conditionIndex) => {
        if (conditionIndex !== index) return condition;

        if (field === "externalLoadKg") {
          return { ...condition, externalLoadKg: value };
        }

        return {
          ...condition,
          jumpHeightsCm: condition.jumpHeightsCm.map((height, heightIndex) =>
            heightIndex === field ? value : height,
          ) as [string, string, string],
        };
      }),
    }));
    setContextError(null);
  };

  const validateAndReview = () => {
    if (!isTestExecutionContextComplete(context)) {
      setContextError("El contexto de ejecución está incompleto.");
      return;
    }

    if (!hasSelectedPlayer) {
      setContextError("Selecciona un jugador activo antes de revisar el perfil.");
      return;
    }

    const validationErrors = validateVerticalForceVelocityForm(form);
    const hasValidationErrors =
      validationErrors.performedAt ||
      validationErrors.bodyMassKg ||
      validationErrors.pushOffDistanceCm ||
      validationErrors.conditionsMessage ||
      validationErrors.conditions.some(
        (conditionErrors) => Object.keys(conditionErrors).length > 0,
      );

    if (hasValidationErrors) {
      setErrors(validationErrors);
      return;
    }

    if (summary.mathematicalError) {
      setContextError(summary.mathematicalError);
      return;
    }

    setErrors({ conditions: [] });
    setContextError(null);
    setIsReview(true);
    onReview(form.performedAt);
  };

  return (
    <>
      {isReview ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Revisión antes de guardar
          </p>
          <h3 className="mt-2 text-lg font-black text-slate-950">
            Perfil Fuerza–Velocidad vertical
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {VERTICAL_FORCE_VELOCITY_PROTOCOL} · {VERTICAL_FORCE_VELOCITY_DEVICE} · {form.performedAt}
          </p>
          <ProfileSummary summary={summary} />
          <ConditionsTable summary={summary} />
          <ProfileChart summary={summary} />
          {summary.warnings.map((warning) => (
            <StatusMessage key={warning} variant="warning" title="Revisión del perfil">
              {warning}
            </StatusMessage>
          ))}
          {summary.observations && (
            <p className="mt-4 text-sm text-slate-600">
              Observaciones: {summary.observations}
            </p>
          )}
        </section>
      ) : (
        <section className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold text-slate-700">
              Fecha del test
              <input
                type="date"
                value={form.performedAt}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((current) => ({ ...current, performedAt: event.target.value }))
                }
                className={inputClassName}
              />
              {errors.performedAt && <p className="mt-1 text-xs font-semibold text-red-600">{errors.performedAt}</p>}
            </label>
            <label className="text-sm font-bold text-slate-700">
              Peso corporal (kg)
              <input
                type="text"
                inputMode="decimal"
                value={form.bodyMassKg}
                disabled={isSaving}
                onChange={(event) => setForm((current) => ({ ...current, bodyMassKg: event.target.value }))}
                placeholder="Ej. 72,5"
                className={inputClassName}
              />
              {errors.bodyMassKg && <p className="mt-1 text-xs font-semibold text-red-600">{errors.bodyMassKg}</p>}
            </label>
            <label className="text-sm font-bold text-slate-700">
              Distancia vertical de empuje hPO (cm)
              <input
                type="text"
                inputMode="decimal"
                value={form.pushOffDistanceCm}
                disabled={isSaving}
                onChange={(event) => setForm((current) => ({ ...current, pushOffDistanceCm: event.target.value }))}
                placeholder="Ej. 45"
                className={inputClassName}
              />
              {errors.pushOffDistanceCm && <p className="mt-1 text-xs font-semibold text-red-600">{errors.pushOffDistanceCm}</p>}
            </label>
          </div>

          <StatusMessage variant="info" title="Medición de hPO">
            Introduce el desplazamiento vertical del centro de masas desde la posición inicial estandarizada del Squat Jump hasta el despegue. No es la altura de salto ni la longitud de pierna.
          </StatusMessage>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">Condiciones de carga</h3>
                <p className="text-sm text-slate-600">Incluye exactamente una condición de 0 kg y tres o más con carga externa.</p>
              </div>
              <button
                type="button"
                disabled={isSaving || form.conditions.length >= VERTICAL_FORCE_VELOCITY_MAX_CONDITIONS}
                onClick={() => setForm((current) => ({ ...current, conditions: [...current.conditions, createCondition()] }))}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300"
              >
                Añadir condición
              </button>
            </div>

            {errors.conditionsMessage && <p className="text-sm font-semibold text-red-600">{errors.conditionsMessage}</p>}

            {form.conditions.map((condition, index) => {
              const conditionErrors = errors.conditions[index];

              return (
                <div key={index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-black text-slate-950">Condición {index + 1}</p>
                    <button
                      type="button"
                      disabled={isSaving || form.conditions.length <= VERTICAL_FORCE_VELOCITY_MIN_CONDITIONS}
                      onClick={() => setForm((current) => ({ ...current, conditions: current.conditions.filter((_, conditionIndex) => conditionIndex !== index) }))}
                      className="text-sm font-bold text-slate-600 disabled:text-slate-300"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <label className="text-sm font-bold text-slate-700">Carga externa (kg)
                      <input type="text" inputMode="decimal" value={condition.externalLoadKg} disabled={isSaving} onChange={(event) => updateCondition(index, "externalLoadKg", event.target.value)} placeholder="0" className={inputClassName} />
                    </label>
                    {condition.jumpHeightsCm.map((height, heightIndex) => (
                      <label key={heightIndex} className="text-sm font-bold text-slate-700">Altura salto {heightIndex + 1} (cm)
                        <input type="text" inputMode="decimal" value={height} disabled={isSaving} onChange={(event) => updateCondition(index, heightIndex as HeightIndex, event.target.value)} placeholder="Ej. 32,5" className={inputClassName} />
                      </label>
                    ))}
                  </div>
                  {conditionErrors && Object.keys(conditionErrors).length > 0 && (
                    <p className="mt-2 text-xs font-semibold text-red-600">{Object.values(conditionErrors).join(" ")}</p>
                  )}
                </div>
              );
            })}
          </div>

          <label className="block text-sm font-bold text-slate-700">
            Observaciones (opcional)
            <textarea
              value={form.observations}
              disabled={isSaving}
              onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))}
              className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="font-black text-slate-950">Resumen del perfil</h3>
            <ProfileSummary summary={summary} />
            {summary.conditions.length > 0 && <ConditionsTable summary={summary} />}
            <ProfileChart summary={summary} />
            {summary.mathematicalError && <p className="mt-4 text-sm font-semibold text-red-600">{summary.mathematicalError}</p>}
            {summary.warnings.map((warning) => (
              <StatusMessage key={warning} variant="warning" title="Revisión del perfil">{warning}</StatusMessage>
            ))}
          </div>

          {contextError && <StatusMessage variant="warning" title="Revisa el perfil antes de continuar">{contextError}</StatusMessage>}
        </section>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => {
            if (isReview) {
              setIsReview(false);
              onReturnToExecution();
              return;
            }

            onBack();
          }}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 disabled:text-slate-300"
        >
          Volver
        </button>
        <button type="button" disabled={isSaving} onClick={onCancel} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 disabled:text-slate-300">
          Cancelar
        </button>
        {isReview ? (
          <button type="button" disabled={isSaving} onClick={() => onSave(form, summary)} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300">
            {isSaving ? "Guardando..." : "Confirmar y guardar"}
          </button>
        ) : (
          <button type="button" disabled={isSaving} onClick={validateAndReview} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300">
            Revisar
          </button>
        )}
      </div>
    </>
  );
}
