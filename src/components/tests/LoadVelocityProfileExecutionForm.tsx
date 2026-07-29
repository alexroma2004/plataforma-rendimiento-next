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
  createLoadVelocityProfileSummary,
  LOAD_VELOCITY_PROFILE_DEVICE,
  LOAD_VELOCITY_PROFILE_EXERCISES,
  LOAD_VELOCITY_PROFILE_MAX_LOADS,
  LOAD_VELOCITY_PROFILE_MIN_LOADS,
  type LoadVelocityProfileFormState,
  type LoadVelocityProfileSummary,
  type LoadVelocityProfileValidationErrors,
  validateLoadVelocityProfile,
} from "@/lib/domain/tests/load-velocity-profile";
import {
  isTestExecutionContextComplete,
  type TestExecutionContext,
} from "@/lib/domain/test-execution";

type LoadVelocityProfileExecutionFormProps = {
  context: TestExecutionContext | null;
  hasSelectedPlayer: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onReview: (date: string) => void;
  onReturnToExecution: () => void;
  onSave: (
    form: LoadVelocityProfileFormState,
    summary: LoadVelocityProfileSummary,
  ) => void;
};

type LoadVelocityRepetitionIndex = 0 | 1 | 2;

const createLoadRow = () => ({
  loadKg: "",
  repetitions: ["", "", ""] as [string, string, string],
});

const createInitialForm = (): LoadVelocityProfileFormState => ({
  performedAt: new Date().toISOString().slice(0, 10),
  exercise: "SENTADILLA",
  loads: [createLoadRow(), createLoadRow(), createLoadRow(), createLoadRow()],
  observations: "",
});

const formatNumber = (value: number | null, decimals = 3) => {
  if (value === null) return "—";

  return value.toLocaleString("es-ES", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
};

const formatR2 = (value: number | null) =>
  value === null ? "No definido" : formatNumber(value);

export default function LoadVelocityProfileExecutionForm({
  context,
  hasSelectedPlayer,
  isSaving,
  onBack,
  onCancel,
  onReview,
  onReturnToExecution,
  onSave,
}: LoadVelocityProfileExecutionFormProps) {
  const [form, setForm] = useState(createInitialForm);
  const [errors, setErrors] = useState<LoadVelocityProfileValidationErrors>({
    loads: [],
  });
  const [contextError, setContextError] = useState<string | null>(null);
  const [review, setReview] = useState(false);

  const summary = useMemo(() => createLoadVelocityProfileSummary(form), [form]);
  const chart = useMemo(
    () =>
      summary.rows
        .slice()
        .sort((first, second) => first.loadKg - second.loadKg)
        .map((row) => ({
          load: row.loadKg,
          vmp: row.bestVmp,
          fit:
            summary.slope === null || summary.intercept === null
              ? null
              : summary.slope * row.loadKg + summary.intercept,
        })),
    [summary.intercept, summary.rows, summary.slope],
  );

  const estimated1RmForChart =
    summary.mathematicalError === null &&
    summary.estimated1Rm !== null &&
    Number.isFinite(summary.estimated1Rm) &&
    summary.estimated1Rm > 0
      ? summary.estimated1Rm
      : null;
  const minimumChartLoad = chart.length > 0 ? chart[0].load : 0;
  const maximumChartLoad = chart.length > 0 ? chart[chart.length - 1].load : 0;
  const minimumLoadWithMargin =
    minimumChartLoad > 0 ? minimumChartLoad * 0.92 : 0;
  const xAxisMinimum = Math.max(
    0,
    estimated1RmForChart === null
      ? minimumLoadWithMargin
      : Math.min(minimumLoadWithMargin, estimated1RmForChart * 0.96),
  );
  const xAxisMaximum = Math.max(
    maximumChartLoad * 1.08,
    estimated1RmForChart === null ? 0 : estimated1RmForChart * 1.04,
  );

  const updateLoad = (
    index: number,
    field: "loadKg" | LoadVelocityRepetitionIndex,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      loads: current.loads.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        if (field === "loadKg") {
          return { ...row, loadKg: value };
        }

        return {
          ...row,
          repetitions: row.repetitions.map((repetition, repetitionIndex) =>
            repetitionIndex === field ? value : repetition,
          ) as [string, string, string],
        };
      }),
    }));
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

    const validationErrors = validateLoadVelocityProfile(form);
    const hasValidationErrors =
      validationErrors.performedAt ||
      validationErrors.loads.some((loadErrors) =>
        Object.keys(loadErrors).length > 0,
      );

    if (hasValidationErrors) {
      setErrors(validationErrors);
      return;
    }

    if (summary.mathematicalError) {
      setContextError(summary.mathematicalError);
      return;
    }

    setErrors({ loads: [] });
    setContextError(null);
    setReview(true);
    onReview(form.performedAt);
  };

  const returnToExecution = () => {
    setReview(false);
    onReturnToExecution();
  };

  return (
    <>
      {review ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-lg font-black">Revisión Perfil Carga–Velocidad</h3>
          <p className="mt-2 text-sm">
            {form.exercise} · {LOAD_VELOCITY_PROFILE_DEVICE} · {form.performedAt}
          </p>

          <table className="mt-3 w-full text-sm">
            <thead>
              <tr>
                <th>Carga</th>
                <th>Rep 1</th>
                <th>Rep 2</th>
                <th>Rep 3</th>
                <th>Mejor</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.index}>
                  <td>{row.loadKg}</td>
                  <td>{row.repetitions[0]}</td>
                  <td>{row.repetitions[1]}</td>
                  <td>{row.repetitions[2]}</td>
                  <td>{row.bestVmp}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-sm">
            Pendiente {formatNumber(summary.slope, 6)} · Intercepto{" "}
            {formatNumber(summary.intercept, 4)} · R² {formatR2(summary.r2)} · 1RM{" "}
            {formatNumber(summary.estimated1Rm, 2)} kg
          </p>

          {summary.warning && (
            <StatusMessage variant="warning" title="Advertencia">
              {summary.warning}
            </StatusMessage>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="date"
              value={form.performedAt}
              disabled={isSaving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  performedAt: event.target.value,
                }))
              }
              className="rounded-xl border p-3"
            />
            <select
              value={form.exercise}
              disabled={isSaving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  exercise: event.target.value as typeof current.exercise,
                }))
              }
              className="rounded-xl border p-3"
            >
              {LOAD_VELOCITY_PROFILE_EXERCISES.map((exercise) => (
                <option key={exercise}>{exercise}</option>
              ))}
            </select>
            <div className="rounded-xl border p-3 font-bold">
              {LOAD_VELOCITY_PROFILE_DEVICE}
            </div>
          </div>

          <div className="space-y-3">
            {form.loads.map((row, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-xl border p-3 sm:grid-cols-5"
              >
                <input
                  value={row.loadKg}
                  disabled={isSaving}
                  onChange={(event) =>
                    updateLoad(index, "loadKg", event.target.value)
                  }
                  placeholder="Carga kg"
                  className="rounded border p-2"
                />
                {row.repetitions.map((repetition, repetitionIndex) => (
                  <input
                    key={repetitionIndex}
                    value={repetition}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateLoad(
                        index,
                        repetitionIndex as LoadVelocityRepetitionIndex,
                        event.target.value,
                      )
                    }
                    placeholder={`VMP ${repetitionIndex + 1}`}
                    className="rounded border p-2"
                  />
                ))}
                <button
                  type="button"
                  disabled={
                    isSaving ||
                    form.loads.length <= LOAD_VELOCITY_PROFILE_MIN_LOADS
                  }
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      loads: current.loads.filter(
                        (_, rowIndex) => rowIndex !== index,
                      ),
                    }))
                  }
                >
                  Quitar
                </button>

                {errors.loads[index] && (
                  <p className="text-xs text-red-600 sm:col-span-5">
                    {Object.values(errors.loads[index]).join(" ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={
              isSaving || form.loads.length >= LOAD_VELOCITY_PROFILE_MAX_LOADS
            }
            onClick={() =>
              setForm((current) => ({
                ...current,
                loads: [...current.loads, createLoadRow()],
              }))
            }
            className="rounded bg-slate-950 px-3 py-2 text-white"
          >
            Añadir carga
          </button>

          <textarea
            value={form.observations}
            disabled={isSaving}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                observations: event.target.value,
              }))
            }
            placeholder="Observaciones"
            className="min-h-24 w-full rounded border p-3"
          />

          <div className="rounded-xl border p-4">
            <p>
              Cargas: {summary.rows.length} · Velocidad objetivo: {summary.targetSpeed} m/s
              {" · "}1RM: {formatNumber(summary.estimated1Rm, 2)} kg
            </p>

            {summary.mathematicalError && (
              <p className="mt-2 text-red-600">{summary.mathematicalError}</p>
            )}

            {chart.length > 0 && (
              <div className="mt-3 h-64">
                <ResponsiveContainer>
                  <LineChart data={chart}>
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey="load"
                      domain={[xAxisMinimum, xAxisMaximum]}
                      tickFormatter={(value) => `${value} kg`}
                    />
                    <YAxis />
                    <Tooltip />
                    <Scatter dataKey="vmp" fill="#1d4ed8" />
                    <Line dataKey="fit" stroke="#0f172a" dot={false} />
                    <ReferenceLine
                      y={summary.targetSpeed}
                      stroke="#f59e0b"
                      label={{
                        value: `Objetivo: ${formatNumber(summary.targetSpeed, 2)} m/s`,
                        position: "insideTopRight",
                        fill: "#92400e",
                      }}
                    />
                    {estimated1RmForChart !== null && (
                      <ReferenceLine
                        x={estimated1RmForChart}
                        stroke="#16a34a"
                        strokeDasharray="4 4"
                        label={{
                          value: `1RM estimada: ${formatNumber(estimated1RmForChart, 1)} kg`,
                          position: "insideTopRight",
                          fill: "#166534",
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {contextError && (
            <StatusMessage variant="warning" title="Revisa el perfil">
              {contextError}
            </StatusMessage>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={review ? returnToExecution : onBack}
        >
          Volver
        </button>
        <button type="button" disabled={isSaving} onClick={onCancel}>
          Cancelar
        </button>
        {review ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave(form, summary)}
          >
            Confirmar y guardar
          </button>
        ) : (
          <button type="button" disabled={isSaving} onClick={validateAndReview}>
            Revisar
          </button>
        )}
      </div>
    </>
  );
}
