import StatusMessage from "@/components/ui/StatusMessage";
import type { NeuromuscularMetric } from "@/lib/domain/neuromuscular";
import type {
  NeuromuscularBaselineConfigurationEvent,
} from "@/lib/domain/neuromuscular-baseline-configuration";

type BaselineConfigurationHistoryProps = {
  events: readonly NeuromuscularBaselineConfigurationEvent[];
  metric: NeuromuscularMetric;
  todayMadrid: string;
  currentEvent: NeuromuscularBaselineConfigurationEvent | null;
  nextEvent: NeuromuscularBaselineConfigurationEvent | null;
  loading: boolean;
  loadError: string | null;
};

type BaselineConfigurationVisualStatus =
  | "CURRENT"
  | "NEXT"
  | "SCHEDULED"
  | "PREVIOUS";

function getMetricLabel(metric: NeuromuscularMetric): string {
  return metric === "RSIMOD" ? "RSI modificado" : metric;
}

function getMetricUnit(metric: NeuromuscularMetric): string {
  if (metric === "CMJ") return "cm";
  if (metric === "RSIMOD") return "ratio";
  return "m/s";
}

function formatManualValue(
  value: number,
  metric: NeuromuscularMetric,
): string {
  const maximumFractionDigits = metric === "CMJ" ? 2 : 3;

  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits,
  }).format(value);
}

function formatCivilDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function getVisualStatus(
  event: NeuromuscularBaselineConfigurationEvent,
  currentEvent: NeuromuscularBaselineConfigurationEvent | null,
  nextEvent: NeuromuscularBaselineConfigurationEvent | null,
  todayMadrid: string,
): BaselineConfigurationVisualStatus {
  if (event.id === currentEvent?.id) return "CURRENT";
  if (event.id === nextEvent?.id) return "NEXT";
  if (event.effectiveFrom > todayMadrid) return "SCHEDULED";
  return "PREVIOUS";
}

function getStatusLabel(status: BaselineConfigurationVisualStatus): string {
  if (status === "CURRENT") return "Vigente";
  if (status === "NEXT") return "Próxima";
  if (status === "SCHEDULED") return "Programada";
  return "Anterior";
}

function getStatusClass(status: BaselineConfigurationVisualStatus): string {
  if (status === "CURRENT") return "bg-emerald-100 text-emerald-800";
  if (status === "NEXT") return "bg-blue-100 text-blue-800";
  if (status === "SCHEDULED") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function EventDetails({
  event,
  metric,
  datePrefix,
}: {
  event: NeuromuscularBaselineConfigurationEvent;
  metric: NeuromuscularMetric;
  datePrefix: string;
}) {
  const manualValue = event.manualValue;
  const manualValueLabel =
    event.mode === "MANUAL" &&
    typeof manualValue === "number" &&
    Number.isFinite(manualValue)
      ? formatManualValue(manualValue, metric)
      : null;

  return (
    <>
      <p className="mt-2 text-sm font-black text-slate-950">
        {event.mode === "MANUAL" ? "Manual" : "Automático"}
        {manualValueLabel !== null && (
          <>
            {" · "}
            {manualValueLabel} {getMetricUnit(metric)}
          </>
        )}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {datePrefix} {formatCivilDate(event.effectiveFrom)}
      </p>
      {event.reason !== null && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-bold text-slate-800">Motivo</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{event.reason}</p>
        </div>
      )}
    </>
  );
}

export default function BaselineConfigurationHistory({
  events,
  metric,
  todayMadrid,
  currentEvent,
  nextEvent,
  loading,
  loadError,
}: BaselineConfigurationHistoryProps) {
  if (loading) {
    return (
      <StatusMessage variant="info" title="Configuración de baseline">
        Cargando configuraciones de baseline…
      </StatusMessage>
    );
  }

  if (loadError !== null) {
    return (
      <StatusMessage variant="error" title="Configuración de baseline">
        No se pudo cargar el historial de configuraciones.
      </StatusMessage>
    );
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-label={`Configuración de baseline de ${getMetricLabel(metric)}`}
    >
      <div>
        <h3 className="text-lg font-black text-slate-950">
          Configuración de baseline
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Cada cambio crea un evento nuevo; las configuraciones anteriores se
          conservan para mantener el histórico.
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Los registros históricos utilizan la configuración vigente en la fecha de
          cada sesión.
        </p>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Configuración vigente
        </p>
        {currentEvent === null ? (
          <>
            <p className="mt-2 text-sm font-black text-slate-950">
              Automático por defecto
            </p>
            <p className="mt-1 text-sm text-slate-600">
              No hay eventos de configuración aplicables para esta métrica. Se utiliza
              el baseline automático.
            </p>
          </>
        ) : currentEvent.mode === "AUTOMATIC" ? (
          <>
            <p className="mt-2 text-sm font-black text-slate-950">Automático</p>
            <p className="mt-1 text-sm text-slate-600">
              La métrica utiliza el cálculo automático desde {formatCivilDate(currentEvent.effectiveFrom)}.
            </p>
            {currentEvent.reason !== null && (
              <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">
                <p className="font-bold text-slate-800">Motivo</p>
                <p className="mt-1 whitespace-pre-wrap break-words">{currentEvent.reason}</p>
              </div>
            )}
          </>
        ) : (
          <EventDetails
            event={currentEvent}
            metric={metric}
            datePrefix="Desde"
          />
        )}
      </div>

      {nextEvent !== null && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
            Próxima configuración programada
          </p>
          <EventDetails
            event={nextEvent}
            metric={metric}
            datePrefix="Entrará en vigor el"
          />
          {nextEvent.mode === "AUTOMATIC" && (
            <p className="mt-2 text-sm text-slate-600">
              Volverá al cálculo automático en esa fecha.
            </p>
          )}
        </div>
      )}

      {events.length > 0 && (
        <details className="mt-5 rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-800">
            Ver historial ({events.length})
          </summary>
          <ul className="mt-4 space-y-3">
            {events.map((event) => {
              const status = getVisualStatus(
                event,
                currentEvent,
                nextEvent,
                todayMadrid,
              );

              return (
                <li key={event.id} className="rounded-xl border border-slate-200 p-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClass(status)}`}
                  >
                    {getStatusLabel(status)}
                  </span>
                  <EventDetails
                    event={event}
                    metric={metric}
                    datePrefix={
                      status === "CURRENT"
                        ? "Desde"
                        : status === "PREVIOUS"
                          ? "Efectiva desde"
                          : "Entra en vigor el"
                    }
                  />
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
