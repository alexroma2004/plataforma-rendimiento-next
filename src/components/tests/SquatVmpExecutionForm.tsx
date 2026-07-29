"use client";

import { useMemo, useState } from "react";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  createSquatVmpSummary,
  SQUAT_VMP_DEVICE,
  SQUAT_VMP_UNIT_LOAD,
  SQUAT_VMP_UNIT_SPEED,
  type SquatVmpFormState,
  type SquatVmpSummary,
  type SquatVmpValidationErrors,
  validateSquatVmpForm,
} from "@/lib/domain/tests/squat-vmp";
import { isTestExecutionContextComplete, type TestExecutionContext } from "@/lib/domain/test-execution";

type Props = {
  context: TestExecutionContext | null;
  hasSelectedPlayer: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onReview: (performedAt: string) => void;
  onReturnToExecution: () => void;
  onSave: (form: SquatVmpFormState, summary: SquatVmpSummary) => void;
};

function createInitialForm(): SquatVmpFormState {
  return { performedAt: new Date().toISOString().slice(0, 10), loadKg: "", vmp: "", observations: "" };
}

function formatValue(value: number | null, unit: string) {
  return value === null ? "—" : `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ${unit}`;
}

function Detail({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500">{title}</p><p className="mt-2 text-lg font-black text-slate-950">{value}</p></div>;
}

export default function SquatVmpExecutionForm({ context, hasSelectedPlayer, isSaving, onBack, onCancel, onReview, onReturnToExecution, onSave }: Props) {
  const [form, setForm] = useState<SquatVmpFormState>(createInitialForm);
  const [errors, setErrors] = useState<SquatVmpValidationErrors>({});
  const [contextError, setContextError] = useState<string | null>(null);
  const [isReview, setIsReview] = useState(false);
  const summary = useMemo(() => createSquatVmpSummary(form), [form]);

  function updateField(field: keyof SquatVmpFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setContextError(null);
  }

  function handleReview() {
    if (!isTestExecutionContextComplete(context)) { setContextError("El contexto de ejecución está incompleto."); return; }
    if (!hasSelectedPlayer) { setContextError("Selecciona un jugador activo antes de revisar VMP Sentadilla."); return; }
    const validationErrors = validateSquatVmpForm(form);
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setErrors({}); setContextError(null); setIsReview(true); onReview(form.performedAt);
  }

  const details = <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Detail title="Ejercicio" value="Sentadilla" /><Detail title="Dispositivo" value={SQUAT_VMP_DEVICE} /><Detail title="Carga utilizada" value={formatValue(summary.loadKg, SQUAT_VMP_UNIT_LOAD)} /><Detail title="VMP máxima" value={formatValue(summary.maximumVmp, SQUAT_VMP_UNIT_SPEED)} /></div>;

  return <>
    {isReview ? <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"><p className="text-xs font-black uppercase tracking-wide text-blue-600">Revisión antes de guardar</p><h3 className="mt-2 text-lg font-black text-slate-950">Resumen VMP Sentadilla</h3><p className="mt-3 text-sm text-slate-600">Fecha: {form.performedAt}</p>{details}<div className="mt-4 grid gap-3 sm:grid-cols-2"><Detail title="VMP repetición 1" value={formatValue(summary.repetitionVmp, SQUAT_VMP_UNIT_SPEED)} /><Detail title="VMP máxima" value={formatValue(summary.maximumVmp, SQUAT_VMP_UNIT_SPEED)} /></div><p className="mt-4 text-sm leading-6 text-slate-600">La VMP máxima coincide con la única repetición registrada.</p>{summary.observations && <p className="mt-4 text-sm leading-6 text-slate-600">Observaciones: {summary.observations}</p>}</div> : <div className="mt-6 space-y-6"><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-bold text-slate-700">Fecha del test<input type="date" value={form.performedAt} disabled={isSaving} onChange={(event) => updateField("performedAt", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" />{errors.performedAt && <p className="mt-1 text-xs font-semibold text-red-600">{errors.performedAt}</p>}</label><label className="text-sm font-bold text-slate-700">Carga total (kg)<input type="text" inputMode="decimal" value={form.loadKg} disabled={isSaving} onChange={(event) => updateField("loadKg", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" placeholder="Ej. 82,5" />{errors.loadKg && <p className="mt-1 text-xs font-semibold text-red-600">{errors.loadKg}</p>}</label><label className="text-sm font-bold text-slate-700">VMP (m/s)<input type="text" inputMode="decimal" value={form.vmp} disabled={isSaving} onChange={(event) => updateField("vmp", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" placeholder="Ej. 0,82" />{errors.vmp && <p className="mt-1 text-xs font-semibold text-red-600">{errors.vmp}</p>}</label></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"><p className="text-sm font-black text-slate-950">Dispositivo: {SQUAT_VMP_DEVICE}</p><p className="mt-2 text-2xl font-black text-blue-950">VMP máxima: {formatValue(summary.maximumVmp, SQUAT_VMP_UNIT_SPEED)}</p><p className="mt-1 text-sm text-slate-600">Corresponde a la única repetición registrada.</p></div><label className="block text-sm font-bold text-slate-700">Observaciones (opcional)<textarea value={form.observations} disabled={isSaving} onChange={(event) => updateField("observations", event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" /></label>{contextError && <StatusMessage variant="warning" title="Revisa VMP Sentadilla antes de continuar">{contextError}</StatusMessage>}</div>}
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => { if (isReview) { setIsReview(false); onReturnToExecution(); } else onBack(); }} disabled={isSaving} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 disabled:text-slate-300">Volver</button><button type="button" onClick={onCancel} disabled={isSaving} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 disabled:text-slate-300">Cancelar</button>{isReview ? <button type="button" onClick={() => onSave(form, summary)} disabled={isSaving} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300">{isSaving ? "Guardando..." : "Confirmar y guardar"}</button> : <button type="button" onClick={handleReview} disabled={isSaving} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300">Revisar</button>}</div>
  </>;
}
