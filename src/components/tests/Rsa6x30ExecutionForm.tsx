"use client";

import { useMemo, useState } from "react";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  calculateRsa6x30Summary,
  RSA_6X30_SPRINT_COUNT,
  RSA_6X30_UNIT_PERCENTAGE,
  RSA_6X30_UNIT_TIME,
  type Rsa6x30FormState,
  type Rsa6x30Summary,
  type Rsa6x30ValidationErrors,
  validateRsa6x30Form,
} from "@/lib/domain/tests/rsa-6x30";
import {
  isTestExecutionContextComplete,
  type TestExecutionContext,
} from "@/lib/domain/test-execution";

type Rsa6x30ExecutionFormProps = {
  context: TestExecutionContext | null;
  hasSelectedPlayer: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onReview: (performedAt: string) => void;
  onReturnToExecution: () => void;
  onSave: (form: Rsa6x30FormState, summary: Rsa6x30Summary) => void;
};

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(): Rsa6x30FormState {
  return {
    performedAt: getTodayDateInputValue(),
    sprintTimes: ["", "", "", "", "", ""],
    observations: "",
  };
}

function formatNumber(value: number | null, decimals = 2) {
  return value === null
    ? "—"
    : value.toLocaleString("es-ES", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
}

function ResultCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

export default function Rsa6x30ExecutionForm({
  context,
  hasSelectedPlayer,
  isSaving,
  onBack,
  onCancel,
  onReview,
  onReturnToExecution,
  onSave,
}: Rsa6x30ExecutionFormProps) {
  const [form, setForm] = useState<Rsa6x30FormState>(createInitialForm);
  const [errors, setErrors] = useState<Rsa6x30ValidationErrors>({
    sprintTimes: [],
  });
  const [contextError, setContextError] = useState<string | null>(null);
  const [isReview, setIsReview] = useState(false);
  const summary = useMemo(() => calculateRsa6x30Summary(form), [form]);

  function updateTime(index: number, value: string) {
    setForm((currentForm) => {
      const sprintTimes = [...currentForm.sprintTimes] as Rsa6x30FormState["sprintTimes"];
      sprintTimes[index] = value;

      return { ...currentForm, sprintTimes };
    });
    setErrors((currentErrors) => {
      const sprintTimes = [...currentErrors.sprintTimes];
      sprintTimes[index] = undefined;

      return { ...currentErrors, sprintTimes };
    });
    setContextError(null);
  }

  function handleReview() {
    if (!isTestExecutionContextComplete(context)) {
      setContextError("El contexto de ejecución está incompleto.");
      return;
    }

    if (!hasSelectedPlayer) {
      setContextError("Selecciona un jugador activo antes de revisar el RSA 6 × 30 m.");
      return;
    }

    const validationErrors = validateRsa6x30Form(form);

    if (
      validationErrors.performedAt ||
      validationErrors.sprintTimes.some(Boolean)
    ) {
      setErrors(validationErrors);
      return;
    }

    setErrors({ sprintTimes: [] });
    setContextError(null);
    setIsReview(true);
    onReview(form.performedAt);
  }

  function handleBack() {
    if (isReview) {
      setIsReview(false);
      onReturnToExecution();
      return;
    }

    onBack();
  }

  const resultCards = (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <ResultCard
        title="Mejor tiempo"
        value={`${formatNumber(summary.bestTime)} ${RSA_6X30_UNIT_TIME}`}
      />
      <ResultCard
        title="Peor tiempo"
        value={`${formatNumber(summary.worstTime)} ${RSA_6X30_UNIT_TIME}`}
      />
      <ResultCard
        title="Tiempo medio"
        value={`${formatNumber(summary.meanTime)} ${RSA_6X30_UNIT_TIME}`}
      />
      <ResultCard
        title="Tiempo total"
        value={`${formatNumber(summary.totalTime)} ${RSA_6X30_UNIT_TIME}`}
      />
      <ResultCard
        title="Decremento"
        value={`${formatNumber(summary.decrement)} ${RSA_6X30_UNIT_PERCENTAGE}`}
      />
      <ResultCard
        title="Diferencia absoluta"
        value={`${formatNumber(summary.absoluteDifference)} ${RSA_6X30_UNIT_TIME}`}
      />
    </div>
  );

  return (
    <>
      {isReview ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Revisión antes de guardar
          </p>
          <h3 className="mt-2 text-lg font-black text-slate-950">Resumen RSA 6 × 30 m</h3>
          <p className="mt-3 text-sm text-slate-600">Fecha: {form.performedAt}</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Sprint</th>
                  <th className="px-4 py-3">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {summary.sprintTimes.map((time, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-bold text-slate-700">{index + 1}</td>
                    <td className="px-4 py-3 font-black text-slate-950">
                      {formatNumber(time)} {RSA_6X30_UNIT_TIME}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultCards}
          {summary.observations && (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Observaciones: {summary.observations}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <label className="block max-w-sm text-sm font-bold text-slate-700">
            Fecha del test
            <input
              type="date"
              value={form.performedAt}
              disabled={isSaving}
              onChange={(event) => {
                setForm((currentForm) => ({
                  ...currentForm,
                  performedAt: event.target.value,
                }));
                setErrors((currentErrors) => ({
                  ...currentErrors,
                  performedAt: undefined,
                }));
              }}
              aria-invalid={Boolean(errors.performedAt)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            {errors.performedAt && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                {errors.performedAt}
              </p>
            )}
          </label>

          <div>
            <h3 className="text-base font-black text-slate-950">Seis sprints de 30 m</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Introduce cada tiempo en segundos. Se acepta coma o punto decimal.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: RSA_6X30_SPRINT_COUNT }, (_, index) => {
                const time = summary.sprintTimes[index] ?? null;
                const isFastest =
                  time !== null && time === summary.bestTime;
                const isSlowest =
                  time !== null && time === summary.worstTime;
                const marker =
                  isFastest && isSlowest
                    ? "Más rápido y más lento"
                    : isFastest
                      ? "Más rápido"
                      : isSlowest
                        ? "Más lento"
                        : null;

                return (
                  <label
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700"
                  >
                    <span className="flex items-center justify-between gap-3">
                      Sprint {index + 1}
                      {marker && (
                        <span className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] font-black text-slate-600">
                          {marker}
                        </span>
                      )}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.sprintTimes[index]}
                      disabled={isSaving}
                      onChange={(event) => updateTime(index, event.target.value)}
                      aria-invalid={Boolean(errors.sprintTimes[index])}
                      className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      placeholder="Ej. 4,52"
                    />
                    <span className="mt-2 block text-xs text-slate-500">segundos</span>
                    {errors.sprintTimes[index] && (
                      <span className="mt-1 block text-xs font-semibold text-red-600">
                        {errors.sprintTimes[index]}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
              Resultados calculados
            </h3>
            {resultCards}
          </div>

          <label className="block text-sm font-bold text-slate-700">
            Observaciones (opcional)
            <textarea
              value={form.observations}
              disabled={isSaving}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  observations: event.target.value,
                }))
              }
              className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Notas del protocolo o de la ejecución"
            />
          </label>

          {contextError && (
            <StatusMessage variant="warning" title="Revisa el RSA 6 × 30 m antes de continuar">
              {contextError}
            </StatusMessage>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleBack}
          disabled={isSaving}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          Cancelar
        </button>
        {isReview ? (
          <button
            type="button"
            onClick={() => onSave(form, summary)}
            disabled={isSaving}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {isSaving ? "Guardando..." : "Confirmar y guardar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReview}
            disabled={isSaving}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            Revisar
          </button>
        )}
      </div>
    </>
  );
}
