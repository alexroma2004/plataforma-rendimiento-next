"use client";

import { useMemo, useState } from "react";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  calculateSprint30Summary,
  SPRINT_30M_MAX_ATTEMPTS,
  SPRINT_30M_UNIT_TIME,
  type Sprint30AttemptInput,
  type Sprint30FormState,
  type Sprint30Summary,
  type Sprint30ValidationErrors,
  validateSprint30Form,
} from "@/lib/domain/tests/sprint-30m";
import {
  isTestExecutionContextComplete,
  type TestExecutionContext,
} from "@/lib/domain/test-execution";

type Sprint30ExecutionFormProps = {
  context: TestExecutionContext | null;
  hasSelectedPlayer: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onReview: (performedAt: string) => void;
  onReturnToExecution: () => void;
  onSave: (form: Sprint30FormState, summary: Sprint30Summary) => void;
};

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createAttempt(): Sprint30AttemptInput {
  return { time5m: "", time30m: "" };
}

function createInitialForm(): Sprint30FormState {
  return {
    performedAt: getTodayDateInputValue(),
    attempts: [createAttempt()],
    observations: "",
  };
}

function formatTime(value: number | null) {
  return value === null
    ? "—"
    : value.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
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

export default function Sprint30ExecutionForm({
  context,
  hasSelectedPlayer,
  isSaving,
  onBack,
  onCancel,
  onReview,
  onReturnToExecution,
  onSave,
}: Sprint30ExecutionFormProps) {
  const [form, setForm] = useState<Sprint30FormState>(createInitialForm);
  const [errors, setErrors] = useState<Sprint30ValidationErrors>({
    attempts: [],
  });
  const [contextError, setContextError] = useState<string | null>(null);
  const [isReview, setIsReview] = useState(false);
  const summary = useMemo(() => calculateSprint30Summary(form), [form]);

  function updateAttempt(
    index: number,
    field: keyof Sprint30AttemptInput,
    value: string,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      attempts: currentForm.attempts.map((attempt, attemptIndex) =>
        attemptIndex === index ? { ...attempt, [field]: value } : attempt,
      ),
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      attempts: currentErrors.attempts.map((attemptErrors, attemptIndex) =>
        attemptIndex === index
          ? { ...attemptErrors, [field]: undefined }
          : attemptErrors,
      ),
    }));
    setContextError(null);
  }

  function handleAddAttempt() {
    setForm((currentForm) =>
      currentForm.attempts.length >= SPRINT_30M_MAX_ATTEMPTS
        ? currentForm
        : { ...currentForm, attempts: [...currentForm.attempts, createAttempt()] },
    );
  }

  function handleRemoveAttempt(index: number) {
    setForm((currentForm) =>
      currentForm.attempts.length <= 1
        ? currentForm
        : {
            ...currentForm,
            attempts: currentForm.attempts.filter(
              (_, attemptIndex) => attemptIndex !== index,
            ),
          },
    );
  }

  function handleReview() {
    if (!isTestExecutionContextComplete(context)) {
      setContextError("El contexto de ejecución está incompleto.");
      return;
    }

    if (!hasSelectedPlayer) {
      setContextError("Selecciona un jugador activo antes de revisar el Sprint 30M.");
      return;
    }

    const validationErrors = validateSprint30Form(form);

    if (
      validationErrors.performedAt ||
      validationErrors.attempts.some((attemptErrors) =>
        Object.keys(attemptErrors).length > 0,
      )
    ) {
      setErrors(validationErrors);
      return;
    }

    setErrors({ attempts: [] });
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
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ResultCard
        title="Mejor 5 m"
        value={`${formatTime(summary.best5m?.time5m ?? null)} ${SPRINT_30M_UNIT_TIME}`}
      />
      <ResultCard
        title="Mejor 30 m"
        value={`${formatTime(summary.best30m?.time30m ?? null)} ${SPRINT_30M_UNIT_TIME}`}
      />
      <ResultCard
        title="Promedio 5 m"
        value={`${formatTime(summary.mean5m)} ${SPRINT_30M_UNIT_TIME}`}
      />
      <ResultCard
        title="Promedio 30 m"
        value={`${formatTime(summary.mean30m)} ${SPRINT_30M_UNIT_TIME}`}
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
          <h3 className="mt-2 text-lg font-black text-slate-950">Resumen Sprint 30M</h3>
          <p className="mt-3 text-sm text-slate-600">Fecha: {form.performedAt}</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Intento</th>
                  <th className="px-4 py-3">5 m</th>
                  <th className="px-4 py-3">30 m</th>
                </tr>
              </thead>
              <tbody>
                {summary.validAttempts.map((attempt) => (
                  <tr key={attempt.attemptNumber} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {attempt.attemptNumber}
                    </td>
                    <td className="px-4 py-3 font-black text-slate-950">
                      {formatTime(attempt.time5m)} {SPRINT_30M_UNIT_TIME}
                    </td>
                    <td className="px-4 py-3 font-black text-slate-950">
                      {formatTime(attempt.time30m)} {SPRINT_30M_UNIT_TIME}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultCards}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResultCard
              title="Intento mejor 5 m"
              value={summary.best5m ? String(summary.best5m.attemptNumber) : "—"}
            />
            <ResultCard
              title="Intento mejor 30 m"
              value={summary.best30m ? String(summary.best30m.attemptNumber) : "—"}
            />
            <ResultCard
              title="5 m asociado a mejor 30 m"
              value={`${formatTime(summary.time5mAssociatedBest30m)} ${SPRINT_30M_UNIT_TIME}`}
            />
            <ResultCard
              title="30 m asociado a mejor 5 m"
              value={`${formatTime(summary.time30mAssociatedBest5m)} ${SPRINT_30M_UNIT_TIME}`}
            />
          </div>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-black text-slate-950">Intentos de sprint</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Registra los tiempos de 5 m y 30 m de cada intento.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddAttempt}
                disabled={isSaving || form.attempts.length >= SPRINT_30M_MAX_ATTEMPTS}
                className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Añadir intento
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {form.attempts.map((attempt, index) => {
                const isBest5m =
                  summary.best5m?.attemptNumber === index + 1;
                const isBest30m =
                  summary.best30m?.attemptNumber === index + 1;

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-slate-800">Intento {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttempt(index)}
                        disabled={isSaving || form.attempts.length <= 1}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-bold text-slate-700">
                        Tiempo 5 m (s)
                        {isBest5m && (
                          <span className="ml-2 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] font-black text-slate-600">
                            Mejor 5 m
                          </span>
                        )}
                        <input
                          type="text"
                          inputMode="decimal"
                          value={attempt.time5m}
                          disabled={isSaving}
                          onChange={(event) =>
                            updateAttempt(index, "time5m", event.target.value)
                          }
                          aria-invalid={Boolean(errors.attempts[index]?.time5m)}
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          placeholder="Ej. 1,12"
                        />
                        {errors.attempts[index]?.time5m && (
                          <span className="mt-1 block text-xs font-semibold text-red-600">
                            {errors.attempts[index]?.time5m}
                          </span>
                        )}
                      </label>
                      <label className="text-sm font-bold text-slate-700">
                        Tiempo 30 m (s)
                        {isBest30m && (
                          <span className="ml-2 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] font-black text-slate-600">
                            Mejor 30 m
                          </span>
                        )}
                        <input
                          type="text"
                          inputMode="decimal"
                          value={attempt.time30m}
                          disabled={isSaving}
                          onChange={(event) =>
                            updateAttempt(index, "time30m", event.target.value)
                          }
                          aria-invalid={Boolean(errors.attempts[index]?.time30m)}
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          placeholder="Ej. 4,52"
                        />
                        {errors.attempts[index]?.time30m && (
                          <span className="mt-1 block text-xs font-semibold text-red-600">
                            {errors.attempts[index]?.time30m}
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
              Resumen automático
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
            <StatusMessage variant="warning" title="Revisa el Sprint 30M antes de continuar">
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
