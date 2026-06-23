"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
import {
  getPlayerDashboardData,
  type PlayerDashboardData,
  type PlayerDashboardGpsRecord,
  type PlayerDashboardNeuromuscularRecord,
  type PlayerDashboardPlayer,
  type PlayerDashboardTestScore,
} from "@/lib/supabase/player-dashboard";

type HistoryScope = "all" | "last_5" | "last_10";

type ComparisonStats = {
  player: PlayerDashboardPlayer;
  gpsRecords: PlayerDashboardGpsRecord[];
  neuromuscularRecords: PlayerDashboardNeuromuscularRecord[];
  testScores: PlayerDashboardTestScore[];
  gpsAverages: {
    totalDistance: number | null;
    hsr: number | null;
    sprintDistance: number | null;
    sprints: number | null;
    acc: number | null;
    dec: number | null;
  };
  gpsTotals: {
    totalDistance: number | null;
    hsr: number | null;
    sprintDistance: number | null;
    sprints: number | null;
    acc: number | null;
    dec: number | null;
  };
  neuromuscularLatest: {
    cmj: number | null;
    rsimod: number | null;
    vmp: number | null;
    rpe: number | null;
  };
  neuromuscularAverages: {
    cmj: number | null;
    rsimod: number | null;
    vmp: number | null;
    rpe: number | null;
  };
  testAverage: number | null;
  testCapacityScores: {
    capacity: string;
    score: number | null;
  }[];
};

type ComparisonMetricKey =
  | "gps_total_distance_avg"
  | "gps_hsr_avg"
  | "gps_sprint_distance_avg"
  | "gps_sprints_avg"
  | "gps_acc_avg"
  | "gps_dec_avg"
  | "cmj_latest"
  | "rsimod_latest"
  | "vmp_latest"
  | "rpe_latest"
  | "test_average";

type ComparisonMetric = {
  key: ComparisonMetricKey;
  category: string;
  label: string;
  unit: string;
  getValue: (stats: ComparisonStats) => number | null;
};

type QuickReadingCard = {
  title: string;
  variant: "info" | "warning";
  message: string;
};

const historyScopeOptions: {
  key: HistoryScope;
  label: string;
  description: string;
}[] = [
  {
    key: "all",
    label: "Todo el histórico",
    description: "Usa todos los registros disponibles.",
  },
  {
    key: "last_10",
    label: "Últimos 10 registros",
    description: "Usa los 10 registros más recientes de cada jugador.",
  },
  {
    key: "last_5",
    label: "Últimos 5 registros",
    description: "Usa los 5 registros más recientes de cada jugador.",
  },
];

const comparisonMetrics: ComparisonMetric[] = [
  {
    key: "gps_total_distance_avg",
    category: "GPS",
    label: "Distancia media",
    unit: "m",
    getValue: (stats) => stats.gpsAverages.totalDistance,
  },
  {
    key: "gps_hsr_avg",
    category: "GPS",
    label: "HSR medio",
    unit: "m",
    getValue: (stats) => stats.gpsAverages.hsr,
  },
  {
    key: "gps_sprint_distance_avg",
    category: "GPS",
    label: "Distancia sprint media",
    unit: "m",
    getValue: (stats) => stats.gpsAverages.sprintDistance,
  },
  {
    key: "gps_sprints_avg",
    category: "GPS",
    label: "Sprints medios",
    unit: "",
    getValue: (stats) => stats.gpsAverages.sprints,
  },
  {
    key: "gps_acc_avg",
    category: "GPS",
    label: "Aceleraciones medias",
    unit: "",
    getValue: (stats) => stats.gpsAverages.acc,
  },
  {
    key: "gps_dec_avg",
    category: "GPS",
    label: "Deceleraciones medias",
    unit: "",
    getValue: (stats) => stats.gpsAverages.dec,
  },
  {
    key: "cmj_latest",
    category: "Neuromuscular",
    label: "CMJ más reciente",
    unit: "cm",
    getValue: (stats) => stats.neuromuscularLatest.cmj,
  },
  {
    key: "rsimod_latest",
    category: "Neuromuscular",
    label: "RSI mod más reciente",
    unit: "",
    getValue: (stats) => stats.neuromuscularLatest.rsimod,
  },
  {
    key: "vmp_latest",
    category: "Neuromuscular",
    label: "VMP más reciente",
    unit: "m/s",
    getValue: (stats) => stats.neuromuscularLatest.vmp,
  },
  {
    key: "rpe_latest",
    category: "Neuromuscular",
    label: "RPE más reciente",
    unit: "",
    getValue: (stats) => stats.neuromuscularLatest.rpe,
  },
  {
    key: "test_average",
    category: "Tests",
    label: "Puntuación media tests",
    unit: "",
    getValue: (stats) => stats.testAverage,
  },
];

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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

function formatMetric(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const decimals = unit === "m" || unit === "" ? 0 : 2;
  const formatted = formatNumber(value, decimals);

  return unit ? `${formatted} ${unit}` : formatted;
}

function formatDifference(
  valueA: number | null | undefined,
  valueB: number | null | undefined,
  unit: string,
) {
  if (valueA === null || valueA === undefined) return "—";
  if (valueB === null || valueB === undefined) return "—";

  const difference = Number(valueA) - Number(valueB);
  const sign = difference > 0 ? "+" : "";

  return `${sign}${formatMetric(difference, unit)}`;
}

function getDifferenceClass(
  valueA: number | null | undefined,
  valueB: number | null | undefined,
) {
  if (valueA === null || valueA === undefined) {
    return "text-slate-500";
  }

  if (valueB === null || valueB === undefined) {
    return "text-slate-500";
  }

  const difference = Number(valueA) - Number(valueB);

  if (difference > 0) return "text-emerald-700";
  if (difference < 0) return "text-red-700";

  return "text-slate-700";
}

function average(values: Array<number | null | undefined>) {
  const validValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return null;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function sum(values: Array<number | null | undefined>) {
  const validValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return null;

  return validValues.reduce((total, value) => total + value, 0);
}

function getHistoryLimit(scope: HistoryScope) {
  if (scope === "last_5") return 5;
  if (scope === "last_10") return 10;

  return null;
}

function sortByDateDesc<T extends { session_date: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const dateA = new Date(a.session_date ?? "").getTime();
    const dateB = new Date(b.session_date ?? "").getTime();

    return dateB - dateA;
  });
}

function limitRowsByScope<T>(rows: T[], scope: HistoryScope) {
  const limit = getHistoryLimit(scope);

  if (!limit) return rows;

  return rows.slice(0, limit);
}

function recordMatchesPlayer(
  record: {
    player_id: string | null;
    player_name: string;
    normalized_name?: string | null;
  },
  player: PlayerDashboardPlayer,
) {
  if (record.player_id && record.player_id === player.id) {
    return true;
  }

  if (record.normalized_name && record.normalized_name === player.normalized_name) {
    return true;
  }

  return normalizeName(record.player_name) === player.normalized_name;
}

function getFirstNumber(...values: Array<number | null | undefined>) {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function getLatestNeuromuscularValue(
  records: PlayerDashboardNeuromuscularRecord[],
  keys: Array<keyof PlayerDashboardNeuromuscularRecord>,
) {
  const sortedRecords = sortByDateDesc(records);

  for (const record of sortedRecords) {
    for (const key of keys) {
      const value = Number(record[key]);

      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  return null;
}

function getTestCapacityScores(scores: PlayerDashboardTestScore[]) {
  const capacityMap = new Map<
    string,
    {
      total: number;
      count: number;
    }
  >();

  scores.forEach((score) => {
    const value = Number(score.final_score);

    if (!Number.isFinite(value)) return;

    const current = capacityMap.get(score.capacity) ?? {
      total: 0,
      count: 0,
    };

    current.total += value;
    current.count += 1;

    capacityMap.set(score.capacity, current);
  });

  return Array.from(capacityMap.entries())
    .map(([capacity, item]) => ({
      capacity,
      score: item.count > 0 ? item.total / item.count : null,
    }))
    .sort((a, b) => a.capacity.localeCompare(b.capacity));
}

function getPlayerStats(
  data: PlayerDashboardData,
  player: PlayerDashboardPlayer,
  scope: HistoryScope,
): ComparisonStats {
  const gpsRecords = limitRowsByScope(
    sortByDateDesc(
      data.gpsRecords.filter((record) => recordMatchesPlayer(record, player)),
    ),
    scope,
  );

  const neuromuscularRecords = limitRowsByScope(
    sortByDateDesc(
      data.neuromuscularRecords.filter((record) =>
        recordMatchesPlayer(record, player),
      ),
    ),
    scope,
  );

  const testScores = data.testScores.filter((score) =>
    recordMatchesPlayer(score, player),
  );

  const cmjValues = neuromuscularRecords.map((record) =>
    getFirstNumber(record.cmj_post, record.cmj_pre),
  );

  const rsimodValues = neuromuscularRecords.map((record) =>
    getFirstNumber(record.rsimod_post, record.rsimod_pre),
  );

  const vmpValues = neuromuscularRecords.map((record) =>
    getFirstNumber(record.vmp_post, record.vmp_pre),
  );

  const validTestScores = testScores.map((score) => score.final_score);

  return {
    player,
    gpsRecords,
    neuromuscularRecords,
    testScores,
    gpsAverages: {
      totalDistance: average(gpsRecords.map((record) => record.total_distance)),
      hsr: average(gpsRecords.map((record) => record.hsr)),
      sprintDistance: average(
        gpsRecords.map((record) => record.distance_vrange6),
      ),
      sprints: average(gpsRecords.map((record) => record.sprints)),
      acc: average(gpsRecords.map((record) => record.num_acc)),
      dec: average(gpsRecords.map((record) => record.num_dec)),
    },
    gpsTotals: {
      totalDistance: sum(gpsRecords.map((record) => record.total_distance)),
      hsr: sum(gpsRecords.map((record) => record.hsr)),
      sprintDistance: sum(gpsRecords.map((record) => record.distance_vrange6)),
      sprints: sum(gpsRecords.map((record) => record.sprints)),
      acc: sum(gpsRecords.map((record) => record.num_acc)),
      dec: sum(gpsRecords.map((record) => record.num_dec)),
    },
    neuromuscularLatest: {
      cmj: getLatestNeuromuscularValue(neuromuscularRecords, [
        "cmj_post",
        "cmj_pre",
      ]),
      rsimod: getLatestNeuromuscularValue(neuromuscularRecords, [
        "rsimod_post",
        "rsimod_pre",
      ]),
      vmp: getLatestNeuromuscularValue(neuromuscularRecords, [
        "vmp_post",
        "vmp_pre",
      ]),
      rpe: getLatestNeuromuscularValue(neuromuscularRecords, ["rpe"]),
    },
    neuromuscularAverages: {
      cmj: average(cmjValues),
      rsimod: average(rsimodValues),
      vmp: average(vmpValues),
      rpe: average(neuromuscularRecords.map((record) => record.rpe)),
    },
    testAverage: average(validTestScores),
    testCapacityScores: getTestCapacityScores(testScores),
  };
}

function getCapacityValue(
  rows: ComparisonStats["testCapacityScores"],
  capacity: string,
) {
  return rows.find((row) => row.capacity === capacity)?.score ?? null;
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
        {value}
      </p>

      {description && (
        <p className="mt-2 break-words text-xs font-bold text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

export default function ComparadorPage() {
  const [dashboardData, setDashboardData] = useState<PlayerDashboardData | null>(
    null,
  );

  const [selectedPlayerAId, setSelectedPlayerAId] = useState("");
  const [selectedPlayerBId, setSelectedPlayerBId] = useState("");
  const [selectedMetricKey, setSelectedMetricKey] =
    useState<ComparisonMetricKey>("gps_total_distance_avg");
  const [historyScope, setHistoryScope] = useState<HistoryScope>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);

        const data = await getPlayerDashboardData();

        if (!active) return;

        setDashboardData(data);

        const activePlayers = data.players.filter(
          (player) => player.active !== false,
        );

        if (activePlayers.length > 0) {
          setSelectedPlayerAId(activePlayers[0].id);
        }

        if (activePlayers.length > 1) {
          setSelectedPlayerBId(activePlayers[1].id);
        } else if (activePlayers.length > 0) {
          setSelectedPlayerBId(activePlayers[0].id);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar el comparador.";

        if (active) {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      active = false;
    };
  }, []);

  const players = useMemo(() => {
    return dashboardData?.players ?? [];
  }, [dashboardData]);

  const selectedPlayerA = useMemo(() => {
    return players.find((player) => player.id === selectedPlayerAId) ?? null;
  }, [players, selectedPlayerAId]);

  const selectedPlayerB = useMemo(() => {
    return players.find((player) => player.id === selectedPlayerBId) ?? null;
  }, [players, selectedPlayerBId]);

  const selectedMetric = useMemo(() => {
    return (
      comparisonMetrics.find((metric) => metric.key === selectedMetricKey) ??
      comparisonMetrics[0]
    );
  }, [selectedMetricKey]);

  const playerAStats = useMemo(() => {
    if (!dashboardData || !selectedPlayerA) return null;

    return getPlayerStats(dashboardData, selectedPlayerA, historyScope);
  }, [dashboardData, selectedPlayerA, historyScope]);

  const playerBStats = useMemo(() => {
    if (!dashboardData || !selectedPlayerB) return null;

    return getPlayerStats(dashboardData, selectedPlayerB, historyScope);
  }, [dashboardData, selectedPlayerB, historyScope]);

  const selectedMetricChartData = useMemo(() => {
    if (!playerAStats || !playerBStats) return [];

    return [
      {
        jugador: playerAStats.player.name,
        valor: selectedMetric.getValue(playerAStats) ?? 0,
      },
      {
        jugador: playerBStats.player.name,
        valor: selectedMetric.getValue(playerBStats) ?? 0,
      },
    ];
  }, [playerAStats, playerBStats, selectedMetric]);

  const selectedMetricHasData = useMemo(() => {
    if (!playerAStats || !playerBStats) return false;

    return (
      selectedMetric.getValue(playerAStats) !== null ||
      selectedMetric.getValue(playerBStats) !== null
    );
  }, [playerAStats, playerBStats, selectedMetric]);

  const capacityComparisonRows = useMemo(() => {
    if (!playerAStats || !playerBStats) return [];

    const capacities = new Set<string>();

    playerAStats.testCapacityScores.forEach((row) =>
      capacities.add(row.capacity),
    );

    playerBStats.testCapacityScores.forEach((row) =>
      capacities.add(row.capacity),
    );

    return Array.from(capacities)
      .sort((a, b) => a.localeCompare(b))
      .map((capacity) => ({
        capacity,
        playerAValue: getCapacityValue(playerAStats.testCapacityScores, capacity),
        playerBValue: getCapacityValue(playerBStats.testCapacityScores, capacity),
      }));
  }, [playerAStats, playerBStats]);

  const selectedScopeMeta = useMemo(() => {
    return (
      historyScopeOptions.find((option) => option.key === historyScope) ??
      historyScopeOptions[0]
    );
  }, [historyScope]);

  const quickComparison = useMemo(() => {
    if (!playerAStats || !playerBStats) {
      return {
        hasSufficientData: false,
        cards: [] as QuickReadingCard[],
      };
    }

    const playerAName = playerAStats.player.name;
    const playerBName = playerBStats.player.name;
    const comparableRows = comparisonMetrics.flatMap((metric) => {
      const valueA = metric.getValue(playerAStats);
      const valueB = metric.getValue(playerBStats);

      if (
        valueA === null ||
        valueB === null ||
        !Number.isFinite(Number(valueA)) ||
        !Number.isFinite(Number(valueB))
      ) {
        return [];
      }

      const denominator =
        (Math.abs(Number(valueA)) + Math.abs(Number(valueB))) / 2;
      const relativeDifference =
        denominator === 0
          ? 0
          : (Math.abs(Number(valueA) - Number(valueB)) / denominator) * 100;

      return [{ metric, valueA, valueB, relativeDifference }];
    });
    const mainDifference =
      [...comparableRows]
        .filter((row) => row.metric.key !== "rpe_latest")
        .sort((a, b) => b.relativeDifference - a.relativeDifference)[0] ??
      comparableRows[0] ??
      null;
    const mainDifferenceMessage = !mainDifference
      ? "No hay una variable con datos válidos para ambos jugadores."
      : mainDifference.valueA === mainDifference.valueB
        ? `Ambos jugadores registran el mismo valor en ${
            mainDifference.metric.category
          } · ${mainDifference.metric.label}: ${formatMetric(
            mainDifference.valueA,
            mainDifference.metric.unit,
          )}.`
        : `${
            mainDifference.valueA > mainDifference.valueB
              ? playerAStats.player.name
              : playerBStats.player.name
          } registra el mayor valor en ${
            mainDifference.metric.category
          } · ${mainDifference.metric.label} (${
            playerAStats.player.name
          }: ${formatMetric(
            mainDifference.valueA,
            mainDifference.metric.unit,
          )}; ${playerBStats.player.name}: ${formatMetric(
            mainDifference.valueB,
            mainDifference.metric.unit,
          )}). La diferencia relativa es ${formatNumber(
            mainDifference.relativeDifference,
            1,
          )}% dentro de los datos disponibles.`;

    function getHigherValueSummary(
      label: string,
      rows: typeof comparableRows,
    ) {
      const playerAHigher = rows.filter(
        (row) => row.valueA > row.valueB,
      ).length;
      const playerBHigher = rows.filter(
        (row) => row.valueB > row.valueA,
      ).length;
      const ties = rows.length - playerAHigher - playerBHigher;

      return `${label}: ${playerAName} registra el mayor valor en ${
        playerAHigher
      }, ${playerBName} en ${
        playerBHigher
      } y hay ${ties} empates.`;
    }

    const categoryMessages = ["GPS", "Neuromuscular"]
      .map((category) => {
        const rows = comparableRows.filter(
          (row) => row.metric.category === category,
        );

        return rows.length > 0 ? getHigherValueSummary(category, rows) : null;
      })
      .filter((value): value is string => Boolean(value));
    const comparableCapacityRows = capacityComparisonRows.filter(
      (row) =>
        row.playerAValue !== null &&
        row.playerBValue !== null &&
        Number.isFinite(Number(row.playerAValue)) &&
        Number.isFinite(Number(row.playerBValue)),
    );

    if (comparableCapacityRows.length > 0) {
      const playerAHigher = comparableCapacityRows.filter(
        (row) => Number(row.playerAValue) > Number(row.playerBValue),
      ).length;
      const playerBHigher = comparableCapacityRows.filter(
        (row) => Number(row.playerBValue) > Number(row.playerAValue),
      ).length;
      const ties =
        comparableCapacityRows.length - playerAHigher - playerBHigher;

      categoryMessages.push(
        `Tests: ${playerAStats.player.name} registra mayor puntuación media en ${
          playerAHigher
        } capacidades, ${playerBStats.player.name} en ${
          playerBHigher
        } y hay ${ties} empates.`,
      );
    } else {
      const testRows = comparableRows.filter(
        (row) => row.metric.category === "Tests",
      );

      if (testRows.length > 0) {
        categoryMessages.push(getHigherValueSummary("Tests", testRows));
      }
    }

    const averageRelativeDifference =
      comparableRows.length > 0
        ? comparableRows.reduce(
            (total, row) => total + row.relativeDifference,
            0,
          ) / comparableRows.length
        : null;
    const balanceLevel =
      averageRelativeDifference === null
        ? null
        : averageRelativeDifference < 5
          ? "baja"
          : averageRelativeDifference < 15
            ? "moderada"
            : "alta";
    const balanceMessage =
      averageRelativeDifference === null || balanceLevel === null
        ? "No hay suficientes variables comunes para valorar el equilibrio comparativo."
        : `La diferencia relativa media entre ${
            comparableRows.length
          } variables comparables es ${formatNumber(
            averageRelativeDifference,
            1,
          )}% y se describe como ${balanceLevel}. Es una referencia descriptiva, no una medida de rendimiento absoluto o riesgo.`;
    const hasSufficientData =
      playerAStats.player.id !== playerBStats.player.id &&
      comparableRows.length > 0;
    const needsContextReview =
      comparableRows.length < 3 || balanceLevel === "alta";
    const recommendationMessage =
      comparableRows.length < 3
        ? "Completar datos comunes antes de extraer conclusiones y revisar que ambos jugadores tengan una cobertura histórica comparable."
        : balanceLevel === "alta"
          ? "Revisar las variables con mayor diferencia junto a minutos, posición, historial y contexto de medición; no implican por sí solas fatiga, lesión ni riesgo."
          : "Usar la comparación para orientar preguntas individuales y contrastarla con posición, historial y contexto de medición antes de ajustar contenidos.";

    return {
      hasSufficientData,
      cards: [
        {
          title: "Diferencia principal",
          variant: "info",
          message: mainDifferenceMessage,
        },
        {
          title: "Comparación por capacidad",
          variant: "info",
          message:
            categoryMessages.join(" ") ||
            "No hay categorías con datos comunes para ambos jugadores.",
        },
        {
          title: "Equilibrio comparativo",
          variant: balanceLevel === "alta" ? "warning" : "info",
          message: balanceMessage,
        },
        {
          title: "Recomendación para el staff",
          variant: needsContextReview ? "warning" : "info",
          message: recommendationMessage,
        },
      ] as QuickReadingCard[],
    };
  }, [
    capacityComparisonRows,
    playerAStats,
    playerBStats,
  ]);

  return (
    <AppShell
      title="Comparador"
      subtitle="Comparación entre jugadores, fechas, microciclos y variables para analizar diferencias individuales y evolución temporal."
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Comparador individual
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Jugador A vs Jugador B
              </h2>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Selecciona dos jugadores y una métrica para comparar GPS, control
                neuromuscular y puntuaciones de tests físicos desde los datos
                guardados en Supabase.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:w-[760px] xl:grid-cols-4">
              <label className="text-sm font-bold text-slate-700">
                Jugador A
                <select
                  value={selectedPlayerAId}
                  onChange={(event) => setSelectedPlayerAId(event.target.value)}
                  disabled={loading || players.length === 0}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  {players.length === 0 && (
                    <option value="">No hay jugadores</option>
                  )}

                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-bold text-slate-700">
                Jugador B
                <select
                  value={selectedPlayerBId}
                  onChange={(event) => setSelectedPlayerBId(event.target.value)}
                  disabled={loading || players.length === 0}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  {players.length === 0 && (
                    <option value="">No hay jugadores</option>
                  )}

                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-bold text-slate-700">
                Métrica principal
                <select
                  value={selectedMetricKey}
                  onChange={(event) =>
                    setSelectedMetricKey(event.target.value as ComparisonMetricKey)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  {comparisonMetrics.map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.category} · {metric.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-bold text-slate-700">
                Histórico
                <select
                  value={historyScope}
                  onChange={(event) =>
                    setHistoryScope(event.target.value as HistoryScope)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  {historyScopeOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5">
            <StatusMessage variant="info" title="Criterio de histórico">
              Criterio actual: {selectedScopeMeta.description}
            </StatusMessage>
          </div>

          {error && (
            <div className="mt-5">
              <StatusMessage variant="error" title="No se ha podido cargar el comparador">
                {error}
              </StatusMessage>
            </div>
          )}

          {loading && (
            <div className="mt-5">
              <StatusMessage variant="info" title="Cargando comparador">
                Cargando jugadores, registros GPS, controles neuromusculares y
                puntuaciones de tests físicos.
              </StatusMessage>
            </div>
          )}

          {!loading && players.length === 0 && (
            <div className="mt-5">
              <EmptyState
                title="Sin jugadores disponibles"
                description="Todavía no hay jugadores activos cargados. Carga jugadores antes de utilizar el comparador."
              />
            </div>
          )}
        </section>

        {!loading && !error && players.length > 0 && (!playerAStats || !playerBStats) && (
          <EmptyState
            title="Selecciona dos jugadores"
            description="Selecciona dos jugadores válidos para poder generar la comparación."
          />
        )}

        {!loading && playerAStats && playerBStats && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Jugador A"
                value={playerAStats.player.name}
                description={playerAStats.player.position ?? "Sin posición"}
              />

              <StatCard
                label="Jugador B"
                value={playerBStats.player.name}
                description={playerBStats.player.position ?? "Sin posición"}
              />

              <StatCard
                label="Registros GPS"
                value={`${playerAStats.gpsRecords.length} / ${playerBStats.gpsRecords.length}`}
                description="Jugador A / Jugador B"
              />

              <StatCard
                label="Registros neuromusculares"
                value={`${playerAStats.neuromuscularRecords.length} / ${playerBStats.neuromuscularRecords.length}`}
                description="Jugador A / Jugador B"
              />
            </section>

            {quickComparison.hasSufficientData && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Interpretación comparativa
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Lectura rápida comparativa
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Señales orientativas construidas con los datos disponibles y
                  el criterio de histórico seleccionado.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {quickComparison.cards.map((card) => (
                    <StatusMessage
                      key={card.title}
                      variant={card.variant}
                      title={card.title}
                    >
                      {card.message}
                    </StatusMessage>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Métrica principal
                </p>

                <h2 className="text-xl font-black text-slate-950">
                  {selectedMetric.category} · {selectedMetric.label}
                </h2>

                <p className="text-sm leading-6 text-slate-600">
                  Comparación directa de la métrica seleccionada entre ambos
                  jugadores.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="break-words text-xs font-bold text-slate-500">
                    {playerAStats.player.name}
                  </p>
                  <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
                    {formatMetric(
                      selectedMetric.getValue(playerAStats),
                      selectedMetric.unit,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="break-words text-xs font-bold text-slate-500">
                    {playerBStats.player.name}
                  </p>
                  <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
                    {formatMetric(
                      selectedMetric.getValue(playerBStats),
                      selectedMetric.unit,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    Diferencia A - B
                  </p>
                  <p
                    className={`mt-2 break-words text-2xl font-black sm:text-3xl ${getDifferenceClass(
                      selectedMetric.getValue(playerAStats),
                      selectedMetric.getValue(playerBStats),
                    )}`}
                  >
                    {formatDifference(
                      selectedMetric.getValue(playerAStats),
                      selectedMetric.getValue(playerBStats),
                      selectedMetric.unit,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 h-[320px] w-full sm:h-[360px]">
                {!selectedMetricHasData ? (
                  <div className="flex h-full items-center justify-center">
                    <EmptyState
                      title="Sin datos para el gráfico"
                      description="No hay datos disponibles para representar la métrica seleccionada con estos jugadores."
                    />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={selectedMetricChartData}
                      margin={{
                        top: 10,
                        right: 12,
                        left: 0,
                        bottom: 60,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="jugador"
                        tick={{ fontSize: 11 }}
                        angle={-25}
                        textAnchor="end"
                        height={80}
                      />

                      <YAxis
                        width={58}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) =>
                          Math.round(Number(value)).toLocaleString("es-ES")
                        }
                      />

                      <Tooltip
                        formatter={(value) => [
                          formatMetric(Number(value), selectedMetric.unit),
                          selectedMetric.label,
                        ]}
                      />

                      <Legend />

                      <Bar dataKey="valor" name={selectedMetric.label} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Comparación global por métricas
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Tabla resumen con GPS, neuromuscular y tests físicos.
                </p>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {comparisonMetrics.map((metric) => {
                  const valueA = metric.getValue(playerAStats);
                  const valueB = metric.getValue(playerBStats);

                  return (
                    <article key={metric.key} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                            {metric.category}
                          </p>

                          <p className="mt-1 break-words text-base font-black text-slate-950">
                            {metric.label}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-black ${getDifferenceClass(
                            valueA,
                            valueB,
                          )}`}
                        >
                          {formatDifference(valueA, valueB, metric.unit)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div>
                          <p className="break-words text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {playerAStats.player.name}
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMetric(valueA, metric.unit)}
                          </p>
                        </div>

                        <div>
                          <p className="break-words text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {playerBStats.player.name}
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMetric(valueB, metric.unit)}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden max-h-[620px] overflow-auto md:block">
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Bloque</th>
                      <th className="px-4 py-3">Métrica</th>
                      <th className="px-4 py-3">{playerAStats.player.name}</th>
                      <th className="px-4 py-3">{playerBStats.player.name}</th>
                      <th className="px-4 py-3">Diferencia A - B</th>
                    </tr>
                  </thead>

                  <tbody>
                    {comparisonMetrics.map((metric) => {
                      const valueA = metric.getValue(playerAStats);
                      const valueB = metric.getValue(playerBStats);

                      return (
                        <tr key={metric.key} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-bold text-slate-700">
                            {metric.category}
                          </td>

                          <td className="px-4 py-3 font-black text-slate-950">
                            {metric.label}
                          </td>

                          <td className="px-4 py-3">
                            {formatMetric(valueA, metric.unit)}
                          </td>

                          <td className="px-4 py-3">
                            {formatMetric(valueB, metric.unit)}
                          </td>

                          <td
                            className={`px-4 py-3 font-black ${getDifferenceClass(
                              valueA,
                              valueB,
                            )}`}
                          >
                            {formatDifference(valueA, valueB, metric.unit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Totales GPS
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Suma acumulada dentro del histórico seleccionado.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {[
                    {
                      label: "Distancia total",
                      valueA: playerAStats.gpsTotals.totalDistance,
                      valueB: playerBStats.gpsTotals.totalDistance,
                      unit: "m",
                    },
                    {
                      label: "HSR total",
                      valueA: playerAStats.gpsTotals.hsr,
                      valueB: playerBStats.gpsTotals.hsr,
                      unit: "m",
                    },
                    {
                      label: "Distancia sprint total",
                      valueA: playerAStats.gpsTotals.sprintDistance,
                      valueB: playerBStats.gpsTotals.sprintDistance,
                      unit: "m",
                    },
                    {
                      label: "Sprints totales",
                      valueA: playerAStats.gpsTotals.sprints,
                      valueB: playerBStats.gpsTotals.sprints,
                      unit: "",
                    },
                    {
                      label: "Aceleraciones totales",
                      valueA: playerAStats.gpsTotals.acc,
                      valueB: playerBStats.gpsTotals.acc,
                      unit: "",
                    },
                    {
                      label: "Deceleraciones totales",
                      valueA: playerAStats.gpsTotals.dec,
                      valueB: playerBStats.gpsTotals.dec,
                      unit: "",
                    },
                  ].map((row) => (
                    <article key={row.label} className="p-5">
                      <p className="text-base font-black text-slate-950">
                        {row.label}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div>
                          <p className="break-words text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {playerAStats.player.name}
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMetric(row.valueA, row.unit)}
                          </p>
                        </div>

                        <div>
                          <p className="break-words text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {playerBStats.player.name}
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMetric(row.valueB, row.unit)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden max-h-[420px] overflow-auto md:block">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Métrica</th>
                        <th className="px-4 py-3">{playerAStats.player.name}</th>
                        <th className="px-4 py-3">{playerBStats.player.name}</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">Distancia total</td>
                        <td className="px-4 py-3">
                          {formatMetric(playerAStats.gpsTotals.totalDistance, "m")}
                        </td>
                        <td className="px-4 py-3">
                          {formatMetric(playerBStats.gpsTotals.totalDistance, "m")}
                        </td>
                      </tr>

                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">HSR total</td>
                        <td className="px-4 py-3">
                          {formatMetric(playerAStats.gpsTotals.hsr, "m")}
                        </td>
                        <td className="px-4 py-3">
                          {formatMetric(playerBStats.gpsTotals.hsr, "m")}
                        </td>
                      </tr>

                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">
                          Distancia sprint total
                        </td>
                        <td className="px-4 py-3">
                          {formatMetric(
                            playerAStats.gpsTotals.sprintDistance,
                            "m",
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {formatMetric(
                            playerBStats.gpsTotals.sprintDistance,
                            "m",
                          )}
                        </td>
                      </tr>

                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">Sprints totales</td>
                        <td className="px-4 py-3">
                          {formatMetric(playerAStats.gpsTotals.sprints, "")}
                        </td>
                        <td className="px-4 py-3">
                          {formatMetric(playerBStats.gpsTotals.sprints, "")}
                        </td>
                      </tr>

                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">
                          Aceleraciones totales
                        </td>
                        <td className="px-4 py-3">
                          {formatMetric(playerAStats.gpsTotals.acc, "")}
                        </td>
                        <td className="px-4 py-3">
                          {formatMetric(playerBStats.gpsTotals.acc, "")}
                        </td>
                      </tr>

                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">
                          Deceleraciones totales
                        </td>
                        <td className="px-4 py-3">
                          {formatMetric(playerAStats.gpsTotals.dec, "")}
                        </td>
                        <td className="px-4 py-3">
                          {formatMetric(playerBStats.gpsTotals.dec, "")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Tests por capacidad
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Comparación de la puntuación media por capacidad evaluada.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {capacityComparisonRows.map((row) => (
                    <article key={row.capacity} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-slate-950">
                            {row.capacity}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-black ${getDifferenceClass(
                            row.playerAValue,
                            row.playerBValue,
                          )}`}
                        >
                          {formatDifference(row.playerAValue, row.playerBValue, "")}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div>
                          <p className="break-words text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {playerAStats.player.name}
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMetric(row.playerAValue, "")}
                          </p>
                        </div>

                        <div>
                          <p className="break-words text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {playerBStats.player.name}
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMetric(row.playerBValue, "")}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}

                  {capacityComparisonRows.length === 0 && (
                    <div className="p-5">
                      <EmptyState
                        title="Sin puntuaciones de tests"
                        description="No hay puntuaciones de tests disponibles para estos jugadores."
                      />
                    </div>
                  )}
                </div>

                <div className="hidden max-h-[420px] overflow-auto md:block">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Capacidad</th>
                        <th className="px-4 py-3">{playerAStats.player.name}</th>
                        <th className="px-4 py-3">{playerBStats.player.name}</th>
                        <th className="px-4 py-3">Diferencia</th>
                      </tr>
                    </thead>

                    <tbody>
                      {capacityComparisonRows.map((row) => (
                        <tr key={row.capacity} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-black text-slate-950">
                            {row.capacity}
                          </td>

                          <td className="px-4 py-3">
                            {formatMetric(row.playerAValue, "")}
                          </td>

                          <td className="px-4 py-3">
                            {formatMetric(row.playerBValue, "")}
                          </td>

                          <td
                            className={`px-4 py-3 font-black ${getDifferenceClass(
                              row.playerAValue,
                              row.playerBValue,
                            )}`}
                          >
                            {formatDifference(row.playerAValue, row.playerBValue, "")}
                          </td>
                        </tr>
                      ))}

                      {capacityComparisonRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6">
                            <EmptyState
                              title="Sin puntuaciones de tests"
                              description="No hay puntuaciones de tests disponibles para estos jugadores."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

