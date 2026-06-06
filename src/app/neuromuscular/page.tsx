"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getNeuromuscularRecordsBySessionId,
  getNeuromuscularSessionsFromSupabase,
  type NeuromuscularRecordRow,
  type NeuromuscularSessionRow,
} from "@/lib/supabase/neuromuscular";

type NeuromuscularVariableKey = "cmj" | "rsimod" | "vmp";

const variableOptions: {
  key: NeuromuscularVariableKey;
  label: string;
  unit: string;
}[] = [
  {
    key: "cmj",
    label: "CMJ",
    unit: "cm",
  },
  {
    key: "rsimod",
    label: "RSI modificado",
    unit: "",
  },
  {
    key: "vmp",
    label: "VMP",
    unit: "m/s",
  },
];

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value: number | null | undefined, decimals = 1) {
  if (!isFiniteNumber(value)) return "—";

  return value.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getVariableDecimals(variable: NeuromuscularVariableKey) {
  if (variable === "cmj") return 1;
  return 2;
}

function getVariableUnit(variable: NeuromuscularVariableKey) {
  return variableOptions.find((option) => option.key === variable)?.unit ?? "";
}

function formatVariableValue(
  value: number | null | undefined,
  variable: NeuromuscularVariableKey,
) {
  if (!isFiniteNumber(value)) return "—";

  const unit = getVariableUnit(variable);
  const decimals = getVariableDecimals(variable);

  return `${formatNumber(value, decimals)}${unit ? ` ${unit}` : ""}`;
}

function formatPercent(value: number | null | undefined) {
  if (!isFiniteNumber(value)) return "—";

  const sign = value > 0 ? "+" : "";

  return `${sign}${formatNumber(value, 1)}%`;
}

function getVariableValue(
  row: NeuromuscularRecordRow,
  variable: NeuromuscularVariableKey,
  moment: "pre" | "post",
) {
  if (variable === "cmj") {
    return moment === "pre" ? row.cmj_pre : row.cmj_post;
  }

  if (variable === "rsimod") {
    return moment === "pre" ? row.rsimod_pre : row.rsimod_post;
  }

  return moment === "pre" ? row.vmp_pre : row.vmp_post;
}

function getDelta(
  row: NeuromuscularRecordRow,
  variable: NeuromuscularVariableKey,
) {
  const pre = getVariableValue(row, variable, "pre");
  const post = getVariableValue(row, variable, "post");

  if (!isFiniteNumber(pre) || !isFiniteNumber(post)) {
    return null;
  }

  return post - pre;
}

function getDeltaPercent(
  row: NeuromuscularRecordRow,
  variable: NeuromuscularVariableKey,
) {
  const pre = getVariableValue(row, variable, "pre");
  const post = getVariableValue(row, variable, "post");

  if (!isFiniteNumber(pre) || !isFiniteNumber(post) || pre === 0) {
    return null;
  }

  return ((post - pre) / pre) * 100;
}

function getAverage(values: Array<number | null | undefined>) {
  const validValues = values.filter(isFiniteNumber);

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function getDeltaClass(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return "bg-slate-50 text-slate-500";
  }

  if (value > 0) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value < 0) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-50 text-slate-700";
}

function MetricSummaryCard({
  title,
  variable,
  records,
}: {
  title: string;
  variable: NeuromuscularVariableKey;
  records: NeuromuscularRecordRow[];
}) {
  const preAverage = getAverage(
    records.map((row) => getVariableValue(row, variable, "pre")),
  );

  const postAverage = getAverage(
    records.map((row) => getVariableValue(row, variable, "post")),
  );

  const delta =
    isFiniteNumber(preAverage) && isFiniteNumber(postAverage)
      ? postAverage - preAverage
      : null;

  const deltaPercent =
    isFiniteNumber(preAverage) && isFiniteNumber(postAverage) && preAverage !== 0
      ? ((postAverage - preAverage) / preAverage) * 100
      : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">PRE</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {formatVariableValue(preAverage, variable)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">POST</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {formatVariableValue(postAverage, variable)}
          </p>
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl px-3 py-2 text-sm font-black ${getDeltaClass(
          delta,
        )}`}
      >
        Cambio medio: {formatVariableValue(delta, variable)} ·{" "}
        {formatPercent(deltaPercent)}
      </div>
    </div>
  );
}

export default function NeuromuscularPage() {
  const [sessions, setSessions] = useState<NeuromuscularSessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [records, setRecords] = useState<NeuromuscularRecordRow[]>([]);
  const [selectedVariable, setSelectedVariable] =
    useState<NeuromuscularVariableKey>("cmj");

  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoadingSessions(true);
        setError(null);

        const data = await getNeuromuscularSessionsFromSupabase();

        setSessions(data);

        if (data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar sesiones neuromusculares.";

        setError(message);
      } finally {
        setLoadingSessions(false);
      }
    }

    loadSessions();
  }, []);

  useEffect(() => {
    async function loadRecords() {
      if (!selectedSessionId) {
        setRecords([]);
        return;
      }

      try {
        setLoadingRecords(true);
        setError(null);

        const data = await getNeuromuscularRecordsBySessionId(
          selectedSessionId,
        );

        setRecords(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar registros neuromusculares.";

        setError(message);
      } finally {
        setLoadingRecords(false);
      }
    }

    loadRecords();
  }, [selectedSessionId]);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  const selectedVariableMeta = useMemo(() => {
    return (
      variableOptions.find((option) => option.key === selectedVariable) ??
      variableOptions[0]
    );
  }, [selectedVariable]);

  const rpeAverage = useMemo(() => {
    return getAverage(records.map((row) => row.rpe));
  }, [records]);

  const chartData = useMemo(() => {
    return records
      .map((row) => {
        const pre = getVariableValue(row, selectedVariable, "pre");
        const post = getVariableValue(row, selectedVariable, "post");
        const deltaPercent = getDeltaPercent(row, selectedVariable);

        return {
          jugador: row.player_name,
          pre,
          post,
          deltaPercent,
          sortValue: post ?? pre ?? 0,
        };
      })
      .filter((row) => isFiniteNumber(row.pre) || isFiniteNumber(row.post))
      .sort((a, b) => Number(b.sortValue ?? 0) - Number(a.sortValue ?? 0))
      .slice(0, 14);
  }, [records, selectedVariable]);

  const postAverage = useMemo(() => {
    return getAverage(
      records.map((row) => getVariableValue(row, selectedVariable, "post")),
    );
  }, [records, selectedVariable]);

  const deltaRows = useMemo(() => {
    return records
      .map((row) => ({
        id: row.id,
        playerName: row.player_name,
        position: row.position,
        pre: getVariableValue(row, selectedVariable, "pre"),
        post: getVariableValue(row, selectedVariable, "post"),
        delta: getDelta(row, selectedVariable),
        deltaPercent: getDeltaPercent(row, selectedVariable),
      }))
      .sort((a, b) => Number(b.deltaPercent ?? -999) - Number(a.deltaPercent ?? -999));
  }, [records, selectedVariable]);

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-950">
      <section className="rounded-2xl bg-slate-950 p-8 text-white shadow">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
          Plataforma de rendimiento
        </p>

        <h1 className="mt-3 text-4xl font-black">
          Rendimiento neuromuscular
        </h1>

        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200">
          Consulta las sesiones neuromusculares cargadas desde CSV y analiza la
          respuesta PRE-POST en CMJ, RSI modificado y VMP.
        </p>
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
              Sesiones guardadas
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Seleccionar sesión neuromuscular
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Selecciona una sesión para visualizar los registros importados.
            </p>
          </div>

          <div className="w-full md:w-[440px]">
            <label className="text-sm font-bold text-slate-700">
              Sesión
              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                disabled={loadingSessions || sessions.length === 0}
              >
                {sessions.length === 0 && (
                  <option value="">
                    No hay sesiones neuromusculares guardadas
                  </option>
                )}

                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_date} · {session.microcycle ?? "N/A"} ·{" "}
                    {session.session_name ?? "Sesión neuromuscular"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loadingSessions && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
            Cargando sesiones neuromusculares...
          </div>
        )}

        {!loadingSessions && sessions.length === 0 && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
            Todavía no hay sesiones neuromusculares guardadas. Primero sube una
            sesión desde la página de carga neuromuscular.
          </div>
        )}

        {selectedSession && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Fecha</p>
              <p className="mt-2 text-2xl font-black">
                {selectedSession.session_date}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Microciclo</p>
              <p className="mt-2 text-2xl font-black">
                {selectedSession.microcycle ?? "N/A"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Nombre</p>
              <p className="mt-2 text-2xl font-black">
                {selectedSession.session_name ?? "Sesión neuromuscular"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Registros</p>
              <p className="mt-2 text-2xl font-black">{records.length}</p>
            </div>
          </div>
        )}
      </section>

      {selectedSessionId && (
        <section className="mt-8">
          {loadingRecords ? (
            <div className="rounded-2xl bg-white p-6 text-sm font-bold text-slate-600 shadow">
              Cargando registros neuromusculares...
            </div>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Jugadores
                  </p>
                  <p className="mt-4 text-4xl font-black">{records.length}</p>
                </div>

                <MetricSummaryCard
                  title="CMJ medio"
                  variable="cmj"
                  records={records}
                />

                <MetricSummaryCard
                  title="RSI modificado medio"
                  variable="rsimod"
                  records={records}
                />

                <MetricSummaryCard
                  title="VMP media"
                  variable="vmp"
                  records={records}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    RPE medio
                  </p>
                  <p className="mt-3 text-3xl font-black">
                    {formatNumber(rpeAverage, 1)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Registros con CMJ POST
                  </p>
                  <p className="mt-3 text-3xl font-black">
                    {
                      records.filter((row) => isFiniteNumber(row.cmj_post))
                        .length
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Registros con VMP POST
                  </p>
                  <p className="mt-3 text-3xl font-black">
                    {
                      records.filter((row) => isFiniteNumber(row.vmp_post))
                        .length
                    }
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                      Análisis PRE-POST
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                      Comparación por variable
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm text-slate-600">
                      Visualiza el valor PRE y POST de cada jugador en la sesión
                      seleccionada.
                    </p>
                  </div>

                  <label className="w-full text-sm font-bold text-slate-700 md:w-[320px]">
                    Variable
                    <select
                      value={selectedVariable}
                      onChange={(event) =>
                        setSelectedVariable(
                          event.target.value as NeuromuscularVariableKey,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    >
                      {variableOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-6 h-[440px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{
                        top: 10,
                        right: 30,
                        left: 90,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        type="number"
                        tickFormatter={(value) =>
                          Number(value).toLocaleString("es-ES")
                        }
                      />

                      <YAxis
                        type="category"
                        dataKey="jugador"
                        width={130}
                        tick={{
                          fontSize: 12,
                        }}
                      />

                      <Tooltip
                        formatter={(value, name) => {
                          const label = name === "pre" ? "PRE" : "POST";

                          return [
                            formatVariableValue(
                              Number(value),
                              selectedVariable,
                            ),
                            label,
                          ];
                        }}
                      />

                      {isFiniteNumber(postAverage) && (
                        <ReferenceLine
                          x={postAverage}
                          strokeDasharray="4 4"
                          label="Media POST"
                        />
                      )}

                      <Bar dataKey="pre" name="PRE" radius={[0, 8, 8, 0]} />
                      <Bar dataKey="post" name="POST" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                <div className="border-b border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-black">
                    Ranking de cambio PRE-POST
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Ordenado por el mayor cambio porcentual en{" "}
                    {selectedVariableMeta.label}.
                  </p>
                </div>

                <div className="max-h-[440px] overflow-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Jugador</th>
                        <th className="px-4 py-3">Posición</th>
                        <th className="px-4 py-3">PRE</th>
                        <th className="px-4 py-3">POST</th>
                        <th className="px-4 py-3">Cambio absoluto</th>
                        <th className="px-4 py-3">Cambio %</th>
                      </tr>
                    </thead>

                    <tbody>
                      {deltaRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-black">
                            {row.playerName}
                          </td>

                          <td className="px-4 py-3">
                            {row.position ?? "—"}
                          </td>

                          <td className="px-4 py-3">
                            {formatVariableValue(row.pre, selectedVariable)}
                          </td>

                          <td className="px-4 py-3">
                            {formatVariableValue(row.post, selectedVariable)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${getDeltaClass(
                                row.delta,
                              )}`}
                            >
                              {formatVariableValue(
                                row.delta,
                                selectedVariable,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${getDeltaClass(
                                row.deltaPercent,
                              )}`}
                            >
                              {formatPercent(row.deltaPercent)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-black">
                    Registros neuromusculares por jugador
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Tabla completa de la sesión neuromuscular seleccionada.
                  </p>
                </div>

                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full min-w-[1300px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Jugador</th>
                        <th className="px-4 py-3">Posición</th>
                        <th className="px-4 py-3">CMJ PRE</th>
                        <th className="px-4 py-3">CMJ POST</th>
                        <th className="px-4 py-3">RSI PRE</th>
                        <th className="px-4 py-3">RSI POST</th>
                        <th className="px-4 py-3">VMP PRE</th>
                        <th className="px-4 py-3">VMP POST</th>
                        <th className="px-4 py-3">Carga sentadilla</th>
                        <th className="px-4 py-3">RPE</th>
                        <th className="px-4 py-3">Notas</th>
                      </tr>
                    </thead>

                    <tbody>
                      {records.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-black">
                            {row.player_name}
                          </td>

                          <td className="px-4 py-3">
                            {row.position ?? "—"}
                          </td>

                          <td className="px-4 py-3">
                            {formatVariableValue(row.cmj_pre, "cmj")}
                          </td>

                          <td className="px-4 py-3">
                            {formatVariableValue(row.cmj_post, "cmj")}
                          </td>

                          <td className="px-4 py-3">
                            {formatVariableValue(row.rsimod_pre, "rsimod")}
                          </td>

                          <td className="px-4 py-3">
                            {formatVariableValue(row.rsimod_post, "rsimod")}
                          </td>

                          <td className="px-4 py-3">
                            {formatVariableValue(row.vmp_pre, "vmp")}
                          </td>

                          <td className="px-4 py-3">
                            {formatVariableValue(row.vmp_post, "vmp")}
                          </td>

                          <td className="px-4 py-3">
                            {isFiniteNumber(row.squat_load_kg)
                              ? `${formatNumber(row.squat_load_kg, 0)} kg`
                              : "—"}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(row.rpe, 0)}
                          </td>

                          <td className="px-4 py-3">
                            {row.notes ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}