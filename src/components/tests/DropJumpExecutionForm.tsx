"use client";

import { useMemo, useState } from "react";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  calculateDropJumpRsi,
  calculateDropJumpSummary,
  DROP_JUMP_DEVICE,
  DROP_JUMP_MAX_ATTEMPTS,
  DROP_JUMP_UNIT_RSI,
  modalityIncludesDropJumpBipodal,
  modalityIncludesDropJumpUnipodal,
  validateDropJumpExecutionInput,
  type DropJumpAttemptInput,
  type DropJumpAttemptSide,
  type DropJumpModality,
  type DropJumpSummary,
  type DropJumpValidAttempt,
} from "@/lib/domain/tests/drop-jump";
import {
  isTestExecutionContextComplete,
  type TestExecutionContext,
} from "@/lib/domain/test-execution";

export type DropJumpFormState = {
  performedAt: string;
  bodyMassKg: string;
  boxHeightCm: string;
  modality: DropJumpModality;
  bipodalAttempts: DropJumpAttemptInput[];
  rightAttempts: DropJumpAttemptInput[];
  leftAttempts: DropJumpAttemptInput[];
};

type DropJumpExecutionFormProps = {
  context: TestExecutionContext | null;
  hasSelectedPlayer: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onReview: (performedAt: string) => void;
  onReturnToExecution: () => void;
  onSave: (form: DropJumpFormState, summary: DropJumpSummary) => void;
};

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialAttempt(): DropJumpAttemptInput {
  return { heightCm: "", contactMs: "" };
}

function createInitialForm(): DropJumpFormState {
  return {
    performedAt: getTodayDateInputValue(),
    bodyMassKg: "",
    boxHeightCm: "",
    modality: "BIPODAL",
    bipodalAttempts: [createInitialAttempt()],
    rightAttempts: [createInitialAttempt()],
    leftAttempts: [createInitialAttempt()],
  };
}

function formatNumber(value: number | null | undefined, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const number = Number(value);

  return number.toLocaleString("es-ES", {
    minimumFractionDigits: Number.isInteger(number) ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
}

function getBestDescription(bestAttempt: DropJumpValidAttempt | null) {
  if (!bestAttempt) return undefined;

  return `Intento ${bestAttempt.attemptNumber} · ${formatNumber(
    bestAttempt.heightCm,
  )} cm · ${formatNumber(bestAttempt.contactMs)} ms`;
}

function getBestValue(bestAttempt: DropJumpValidAttempt | null) {
  if (!bestAttempt) return "—";

  return `${formatNumber(bestAttempt.rsi, 3)} ${DROP_JUMP_UNIT_RSI}`;
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
      {description && (
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      )}
    </div>
  );
}

export default function DropJumpExecutionForm({
  context,
  hasSelectedPlayer,
  isSaving,
  onBack,
  onCancel,
  onReview,
  onReturnToExecution,
  onSave,
}: DropJumpExecutionFormProps) {
  const [form, setForm] = useState<DropJumpFormState>(createInitialForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [isReview, setIsReview] = useState(false);
  const summary = useMemo(
    () =>
      calculateDropJumpSummary({
        bodyMassKg: form.bodyMassKg,
        boxHeightCm: form.boxHeightCm,
        modality: form.modality,
        bipodalAttempts: form.bipodalAttempts,
        rightAttempts: form.rightAttempts,
        leftAttempts: form.leftAttempts,
      }),
    [form],
  );

  function updateAttempts(
    side: DropJumpAttemptSide,
    updater: (attempts: DropJumpAttemptInput[]) => DropJumpAttemptInput[],
  ) {
    setForm((currentForm) => {
      if (side === "BIPODAL") {
        return {
          ...currentForm,
          bipodalAttempts: updater(currentForm.bipodalAttempts),
        };
      }

      if (side === "DERECHA") {
        return {
          ...currentForm,
          rightAttempts: updater(currentForm.rightAttempts),
        };
      }

      return {
        ...currentForm,
        leftAttempts: updater(currentForm.leftAttempts),
      };
    });
  }

  function handleAttemptChange(
    side: DropJumpAttemptSide,
    index: number,
    field: keyof DropJumpAttemptInput,
    value: string,
  ) {
    updateAttempts(side, (attempts) =>
      attempts.map((attempt, attemptIndex) =>
        attemptIndex === index ? { ...attempt, [field]: value } : attempt,
      ),
    );
  }

  function handleAddAttempt(side: DropJumpAttemptSide) {
    updateAttempts(side, (attempts) =>
      attempts.length >= DROP_JUMP_MAX_ATTEMPTS
        ? attempts
        : [...attempts, createInitialAttempt()],
    );
  }

  function handleRemoveAttempt(side: DropJumpAttemptSide, index: number) {
    updateAttempts(side, (attempts) =>
      attempts.length <= 1
        ? attempts
        : attempts.filter((_, attemptIndex) => attemptIndex !== index),
    );
  }

  function handleReview() {
    if (!isTestExecutionContextComplete(context)) {
      setErrors(["El contexto de ejecucion esta incompleto."]);
      return;
    }

    if (!hasSelectedPlayer) {
      setErrors(["Selecciona un jugador activo antes de revisar el Drop Jump."]);
      return;
    }

    const validationErrors = validateDropJumpExecutionInput({
      bodyMassKg: form.bodyMassKg,
      boxHeightCm: form.boxHeightCm,
      modality: form.modality,
      bipodalAttempts: form.bipodalAttempts,
      rightAttempts: form.rightAttempts,
      leftAttempts: form.leftAttempts,
    });

    if (!form.performedAt) {
      validationErrors.unshift("La fecha del test es obligatoria.");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
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

  function renderAttemptGroup({
    side,
    attempts,
    title,
  }: {
    side: DropJumpAttemptSide;
    attempts: DropJumpAttemptInput[];
    title: string;
  }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Altura (cm), contacto (ms) y RSI calculado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleAddAttempt(side)}
            disabled={isSaving || attempts.length >= DROP_JUMP_MAX_ATTEMPTS}
            className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Añadir intento
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {attempts.map((attempt, index) => {
            const rsi = calculateDropJumpRsi(
              attempt.heightCm,
              attempt.contactMs,
            );

            return (
              <div
                key={`${side}-${index}`}
                className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[auto_1fr_1fr_auto_auto] sm:items-end"
              >
                <p className="text-sm font-black text-slate-700">
                  Intento {index + 1}
                </p>

                <label className="text-xs font-bold text-slate-600">
                  Altura (cm)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={String(attempt.heightCm ?? "")}
                    disabled={isSaving}
                    onChange={(event) =>
                      handleAttemptChange(
                        side,
                        index,
                        "heightCm",
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <label className="text-xs font-bold text-slate-600">
                  Contacto (ms)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={String(attempt.contactMs ?? "")}
                    disabled={isSaving}
                    onChange={(event) =>
                      handleAttemptChange(
                        side,
                        index,
                        "contactMs",
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-blue-700">RSI</p>
                  <p className="mt-1 text-sm font-black text-blue-950">
                    {rsi === null
                      ? "—"
                      : `${formatNumber(rsi, 3)} ${DROP_JUMP_UNIT_RSI}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAttempt(side, index)}
                  disabled={isSaving || attempts.length <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  Quitar
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const summaryCards = (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        title="Mejor RSI bipodal"
        value={getBestValue(summary.bestBipodal)}
        description={getBestDescription(summary.bestBipodal)}
      />
      <SummaryCard
        title="Mejor RSI derecha"
        value={getBestValue(summary.bestRight)}
        description={getBestDescription(summary.bestRight)}
      />
      <SummaryCard
        title="Mejor RSI izquierda"
        value={getBestValue(summary.bestLeft)}
        description={getBestDescription(summary.bestLeft)}
      />
      <SummaryCard
        title="Asimetría RSI"
        value={
          summary.asymmetry === null
            ? "—"
            : `${formatNumber(summary.asymmetry)} %`
        }
      />
      <SummaryCard title="Lado mayor" value={summary.bestSide} />
    </div>
  );

  return (
    <>
      {isReview ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Revisión antes de guardar
          </p>
          <h3 className="mt-2 text-lg font-black text-slate-950">Resumen Drop Jump</h3>
          {summaryCards}
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Se guardarán la altura del cajón, todos los intentos válidos, el RSI
            calculado de cada intento y los mejores resultados por RSI. No se
            generarán clasificaciones ni puntuaciones normativas.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm font-bold text-slate-700">
              Fecha del test
              <input
                type="date"
                value={form.performedAt}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    performedAt: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Peso corporal (kg)
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.bodyMassKg}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    bodyMassKg: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Ej. 72.5"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Altura cajón (cm)
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.boxHeightCm}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    boxHeightCm: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Ej. 30"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Modalidad
              <select
                value={form.modality}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    modality: event.target.value as DropJumpModality,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="BIPODAL">BIPODAL</option>
                <option value="UNIPODAL">UNIPODAL</option>
                <option value="AMBOS">AMBOS</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-sm font-black text-slate-950">
              Dispositivo: {DROP_JUMP_DEVICE}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Introduce altura de salto en centímetros y tiempo de contacto en
              milisegundos. El RSI se calcula como 10 × altura_cm / contacto_ms.
            </p>
          </div>

          {modalityIncludesDropJumpBipodal(form.modality) &&
            renderAttemptGroup({
              side: "BIPODAL",
              attempts: form.bipodalAttempts,
              title: "Intentos bipodal",
            })}

          {modalityIncludesDropJumpUnipodal(form.modality) && (
            <div className="grid gap-4 xl:grid-cols-2">
              {renderAttemptGroup({
                side: "DERECHA",
                attempts: form.rightAttempts,
                title: "Intentos derecha",
              })}
              {renderAttemptGroup({
                side: "IZQUIERDA",
                attempts: form.leftAttempts,
                title: "Intentos izquierda",
              })}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
              Resumen previo
            </h3>
            {summaryCards}
          </div>

          {errors.length > 0 && (
            <StatusMessage
              variant="warning"
              title="Revisa el Drop Jump antes de continuar"
            >
              <ul className="list-inside list-disc">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
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
