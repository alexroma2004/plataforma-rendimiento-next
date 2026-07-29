"use client";

import { useMemo, useState } from "react";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  calculateThirtyFifteenIftVift,
  createThirtyFifteenIftSummary,
  THIRTY_FIFTEEN_IFT_UNIT_SPEED,
  type ThirtyFifteenIftFormState,
  type ThirtyFifteenIftSummary,
  type ThirtyFifteenIftValidationErrors,
  validateThirtyFifteenIftForm,
} from "@/lib/domain/tests/thirty-fifteen-ift";
import {
  isTestExecutionContextComplete,
  type TestExecutionContext,
} from "@/lib/domain/test-execution";

type ThirtyFifteenExecutionFormProps = {
  context: TestExecutionContext | null;
  hasSelectedPlayer: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onReview: (performedAt: string) => void;
  onReturnToExecution: () => void;
  onSave: (
    form: ThirtyFifteenIftFormState,
    summary: ThirtyFifteenIftSummary,
  ) => void;
};

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(): ThirtyFifteenIftFormState {
  return {
    performedAt: getTodayDateInputValue(),
    lastCompletedLevel: "",
    withdrawalLevel: "",
    observations: "",
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-semibold text-red-600">{message}</p> : null;
}

function DetailCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

export default function ThirtyFifteenExecutionForm({
  context,
  hasSelectedPlayer,
  isSaving,
  onBack,
  onCancel,
  onReview,
  onReturnToExecution,
  onSave,
}: ThirtyFifteenExecutionFormProps) {
  const [form, setForm] = useState<ThirtyFifteenIftFormState>(createInitialForm);
  const [errors, setErrors] = useState<ThirtyFifteenIftValidationErrors>({});
  const [contextError, setContextError] = useState<string | null>(null);
  const [isReview, setIsReview] = useState(false);
  const summary = useMemo(() => createThirtyFifteenIftSummary(form), [form]);
  const vift = calculateThirtyFifteenIftVift(form.lastCompletedLevel);

  function updateField(
    field: keyof ThirtyFifteenIftFormState,
    value: string,
  ) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setContextError(null);
  }

  function handleReview() {
    if (!isTestExecutionContextComplete(context)) {
      setContextError("El contexto de ejecución está incompleto.");
      return;
    }

    if (!hasSelectedPlayer) {
      setContextError("Selecciona un jugador activo antes de revisar el 30-15 IFT.");
      return;
    }

    const validationErrors = validateThirtyFifteenIftForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
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

  return (
    <>
      {isReview ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Revisión antes de guardar
          </p>
          <h3 className="mt-2 text-lg font-black text-slate-950">Resumen 30-15 IFT</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <DetailCard title="Fecha" value={form.performedAt} />
            <DetailCard
              title="Último nivel completado"
              value={`${summary.lastCompletedLevel} ${THIRTY_FIFTEEN_IFT_UNIT_SPEED}`}
            />
            <DetailCard
              title="Nivel de abandono"
              value={
                summary.withdrawalLevel === null
                  ? "No registrado"
                  : `${summary.withdrawalLevel} ${THIRTY_FIFTEEN_IFT_UNIT_SPEED}`
              }
            />
            <DetailCard
              title="VIFT"
              value={`${summary.vift} ${THIRTY_FIFTEEN_IFT_UNIT_SPEED}`}
            />
            <DetailCard
              title="Observaciones"
              value={summary.observations || "Sin observaciones"}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold text-slate-700">
              Fecha del test
              <input
                type="date"
                value={form.performedAt}
                disabled={isSaving}
                onChange={(event) => updateField("performedAt", event.target.value)}
                aria-invalid={Boolean(errors.performedAt)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <FieldError message={errors.performedAt} />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Último nivel completado (km/h)
              <input
                type="number"
                min="8"
                step="0.5"
                value={form.lastCompletedLevel}
                disabled={isSaving}
                onChange={(event) => updateField("lastCompletedLevel", event.target.value)}
                aria-invalid={Boolean(errors.lastCompletedLevel)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Ej. 18"
              />
              <FieldError message={errors.lastCompletedLevel} />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Nivel de abandono (opcional)
              <input
                type="number"
                min="8"
                step="0.5"
                value={form.withdrawalLevel}
                disabled={isSaving}
                onChange={(event) => updateField("withdrawalLevel", event.target.value)}
                aria-invalid={Boolean(errors.withdrawalLevel)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Ej. 18.5"
              />
              <FieldError message={errors.withdrawalLevel} />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-sm font-black text-slate-950">VIFT calculada</p>
            <p className="mt-2 text-2xl font-black text-blue-950">
              {vift === null ? "—" : `${vift} ${THIRTY_FIFTEEN_IFT_UNIT_SPEED}`}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              La VIFT equivale directamente al último nivel completado.
            </p>
          </div>

          <label className="block text-sm font-bold text-slate-700">
            Observaciones (opcional)
            <textarea
              value={form.observations}
              disabled={isSaving}
              onChange={(event) => updateField("observations", event.target.value)}
              className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Notas del protocolo o de la ejecución"
            />
          </label>

          {contextError && (
            <StatusMessage variant="warning" title="Revisa el 30-15 IFT antes de continuar">
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
