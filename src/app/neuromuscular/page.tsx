"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import BaselineConfigurationForm from "@/components/neuromuscular/BaselineConfigurationForm";
import BaselineConfigurationHistory from "@/components/neuromuscular/BaselineConfigurationHistory";
import NeuromuscularMetricHistorySection from "@/components/neuromuscular/NeuromuscularMetricHistorySection";
import NeuromuscularReadinessSummary from "@/components/neuromuscular/NeuromuscularReadinessSummary";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
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
  getNeuromuscularPlayersByTeamId,
  getNeuromuscularRecordsBySessionId,
  getNeuromuscularSessionsFromSupabase,
  getNeuromuscularTeamsFromSupabase,
  loadPlayerNeuromuscularBaselineConfigurationEvents,
  loadPlayerNeuromuscularHistory,
  type NeuromuscularPlayerRow,
  type NeuromuscularRecordRow,
  type NeuromuscularSessionRow,
  type NeuromuscularTeamRow,
} from "@/lib/supabase/neuromuscular";
import {
  getNextBaselineConfigurationEvent,
  resolveBaselineConfigurationAtDate,
  sortBaselineConfigurationEventsDescending,
  type NeuromuscularBaselineConfigurationEvent,
} from "@/lib/domain/neuromuscular-baseline-configuration";
import { isAppRole, type AppRole } from "@/lib/auth/permissions";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  calculateNeuromuscularReadinessFromLossSeries,
} from "@/lib/domain/neuromuscular-readiness";
import { calculateNeuromuscularLosses } from "@/lib/domain/neuromuscular-loss";
import type {
  NeuromuscularHistoryPoint,
  NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";

type NeuromuscularVariableKey = "cmj" | "rsimod" | "vmp";

type QuickReadingCard = {
  title: string;
  variant: "info" | "warning";
  message: string;
};

type BaselineConfigurationUiContext = {
  teamId: string;
  playerId: string;
  metric: NeuromuscularMetric;
};

function isSameBaselineConfigurationUiContext(
  left: BaselineConfigurationUiContext | null,
  right: BaselineConfigurationUiContext,
): boolean {
  return (
    left?.teamId === right.teamId &&
    left.playerId === right.playerId &&
    left.metric === right.metric
  );
}

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

function getHistoryMetricLabel(metric: NeuromuscularMetric) {
  return metric === "RSIMOD" ? "RSI modificado" : metric;
}

function getCurrentMadridCivilDate(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(
    parts
      .filter(({ type }) => type === "year" || type === "month" || type === "day")
      .map(({ type, value }) => [type, value]),
  );
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (!year || !month || !day) {
    throw new Error("No se pudo obtener la fecha civil de Madrid.");
  }

  return `${year}-${month}-${day}`;
}

function getTeamLabel(team: NeuromuscularTeamRow) {
  const details = [team.category, team.season]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" · ");

  return details ? `${team.name} · ${details}` : team.name;
}

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

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
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

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs font-bold text-slate-500">{description}</p>
      )}
    </div>
  );
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">PRE</p>
          <p className="mt-1 break-words text-xl font-black text-slate-950 sm:text-2xl">
            {formatVariableValue(preAverage, variable)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">POST</p>
          <p className="mt-1 break-words text-xl font-black text-slate-950 sm:text-2xl">
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
  const [teams, setTeams] = useState<NeuromuscularTeamRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [sessions, setSessions] = useState<NeuromuscularSessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [records, setRecords] = useState<NeuromuscularRecordRow[]>([]);
  const [selectedVariable, setSelectedVariable] =
    useState<NeuromuscularVariableKey>("cmj");
  const [selectedHistoryMetric, setSelectedHistoryMetric] =
    useState<NeuromuscularMetric>("CMJ");
  const [teamPlayers, setTeamPlayers] = useState<NeuromuscularPlayerRow[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [playerHistory, setPlayerHistory] = useState<NeuromuscularHistoryPoint[]>(
    [],
  );
  const [loadingPlayerHistory, setLoadingPlayerHistory] = useState(false);
  const [playerHistoryError, setPlayerHistoryError] = useState<string | null>(
    null,
  );
  const [
    baselineConfigurationEvents,
    setBaselineConfigurationEvents,
  ] = useState<NeuromuscularBaselineConfigurationEvent[]>([]);
  const [baselineConfigurationEventsError, setBaselineConfigurationEventsError] = useState<string | null>(
    null,
  );
  const [userRole, setUserRole] = useState<AppRole>("viewer");
  const [loadingUserRole, setLoadingUserRole] = useState(true);
  const [isBaselineConfigurationOpen, setIsBaselineConfigurationOpen] =
    useState(false);
  const [baselineConfigurationMessage, setBaselineConfigurationMessage] =
    useState<{
      variant: "success" | "warning";
      text: string;
    } | null>(null);

  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionsRequestId = useRef(0);
  const latestBaselineConfigurationContextRef =
    useRef<BaselineConfigurationUiContext | null>(null);

  useLayoutEffect(() => {
    latestBaselineConfigurationContextRef.current =
      selectedTeamId && selectedPlayerId
        ? {
            teamId: selectedTeamId,
            playerId: selectedPlayerId,
            metric: selectedHistoryMetric,
          }
        : null;
  }, [selectedHistoryMetric, selectedPlayerId, selectedTeamId]);

  useEffect(() => {
    let cancelled = false;

    async function loadUserRole() {
      try {
        const client = getSupabaseClient();
        const {
          data: { user },
          error: userError,
        } = await client.auth.getUser();

        if (userError || !user) return;

        const { data: roleRow, error: roleError } = await client
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cancelled && !roleError && isAppRole(roleRow?.role)) {
          setUserRole(roleRow.role);
        }
      } catch {
        // El rol de cliente solo controla visibilidad; el servidor autoriza.
      } finally {
        if (!cancelled) setLoadingUserRole(false);
      }
    }

    void loadUserRole();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetIndividualReadiness() {
    setTeamPlayers([]);
    setSelectedPlayerId("");
    setPlayersError(null);
    setPlayerHistory([]);
    setBaselineConfigurationEvents([]);
    setBaselineConfigurationEventsError(null);
    setPlayerHistoryError(null);
    setLoadingPlayerHistory(false);
  }

  async function loadSessionsForTeam(teamId: string) {
    const requestId = sessionsRequestId.current + 1;
    sessionsRequestId.current = requestId;

    if (!teamId) {
      setSessions([]);
      setSelectedSessionId("");
      return;
    }

    const data = await getNeuromuscularSessionsFromSupabase(teamId);

    if (requestId !== sessionsRequestId.current) {
      return;
    }

    setSessions(data);
    setSelectedSessionId(data[0]?.id ?? "");
  }

  useEffect(() => {
    async function loadInitialNeuromuscularData() {
      try {
        setLoadingSessions(true);
        setError(null);

        const teamsData = await getNeuromuscularTeamsFromSupabase();
        const [onlyTeam] = teamsData;
        const resolvedTeamId =
          teamsData.length === 1 && onlyTeam ? onlyTeam.id : "";

        setTeams(teamsData);
        setSelectedTeamId(resolvedTeamId);
        setRecords([]);

        await loadSessionsForTeam(resolvedTeamId);
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

    loadInitialNeuromuscularData();
  }, []);

  async function handleTeamChange(teamId: string) {
    try {
      setIsBaselineConfigurationOpen(false);
      setBaselineConfigurationMessage(null);
      setLoadingSessions(true);
      setError(null);
      setSelectedTeamId(teamId);
      setSessions([]);
      setSelectedSessionId("");
      setRecords([]);
      setLoadingRecords(false);
      resetIndividualReadiness();

      await loadSessionsForTeam(teamId);
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

  useEffect(() => {
    async function loadRecords() {
      if (!selectedSessionId || !selectedTeamId) {
        setRecords([]);
        return;
      }

      try {
        setLoadingRecords(true);
        setError(null);

        const data = await getNeuromuscularRecordsBySessionId(
          selectedSessionId,
          selectedTeamId,
        );

        if (ignore) {
          return;
        }

        setRecords(data);
      } catch (err) {
        if (ignore) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar registros neuromusculares.";

        setError(message);
      } finally {
        if (!ignore) {
          setLoadingRecords(false);
        }
      }
    }

    let ignore = false;
    loadRecords();

    return () => {
      ignore = true;
    };
  }, [selectedSessionId, selectedTeamId]);

  useEffect(() => {
    let cancelled = false;

    async function loadTeamPlayers() {
      setTeamPlayers([]);
      setSelectedPlayerId("");
      setPlayerHistory([]);
      setPlayerHistoryError(null);

      if (!selectedTeamId) {
        setLoadingPlayers(false);
        setPlayersError(null);
        return;
      }

      try {
        setLoadingPlayers(true);
        setPlayersError(null);

        const players = await getNeuromuscularPlayersByTeamId(selectedTeamId);

        if (cancelled) return;

        setTeamPlayers(players);
        setSelectedPlayerId(players.length === 1 ? players[0].id : "");
      } catch (err) {
        if (cancelled) return;

        setPlayersError(
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar los jugadores del equipo.",
        );
      } finally {
        if (!cancelled) setLoadingPlayers(false);
      }
    }

    void loadTeamPlayers();

    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayerHistory() {
      setPlayerHistory([]);
      setBaselineConfigurationEvents([]);
      setBaselineConfigurationEventsError(null);
      setPlayerHistoryError(null);

      if (!selectedTeamId || !selectedPlayerId) {
        setLoadingPlayerHistory(false);
        return;
      }

      try {
        setLoadingPlayerHistory(true);

        const [historyResult, baselineEventsResult] = await Promise.all([
          loadPlayerNeuromuscularHistory({
            teamId: selectedTeamId,
            playerId: selectedPlayerId,
            moment: "PRE",
          }).then(
            (history) => ({ status: "fulfilled" as const, history }),
            (historyError: unknown) => ({
              status: "rejected" as const,
              historyError,
            }),
          ),
          loadPlayerNeuromuscularBaselineConfigurationEvents({
            teamId: selectedTeamId,
            playerId: selectedPlayerId,
          }).then(
            (events) => ({ status: "fulfilled" as const, events }),
            (baselineError: unknown) => ({
              status: "rejected" as const,
              baselineError,
            }),
          ),
        ]);

        if (cancelled) return;

        if (historyResult.status === "fulfilled") {
          setPlayerHistory(historyResult.history);
        } else {
          setPlayerHistoryError(
            historyResult.historyError instanceof Error
              ? historyResult.historyError.message
              : "Error desconocido al cargar el histórico neuromuscular.",
          );
        }

        if (baselineEventsResult.status === "fulfilled") {
          setBaselineConfigurationEvents(baselineEventsResult.events);
          setBaselineConfigurationEventsError(null);
        } else {
          setBaselineConfigurationEvents([]);
          setBaselineConfigurationEventsError(
            baselineEventsResult.baselineError instanceof Error
              ? baselineEventsResult.baselineError.message
              : "Error desconocido al cargar los eventos de configuración del baseline.",
          );
        }
      } catch (err) {
        if (cancelled) return;

        setBaselineConfigurationEvents([]);
        setBaselineConfigurationEventsError(null);
        setPlayerHistoryError(
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar el histórico neuromuscular.",
        );
      } finally {
        if (!cancelled) setLoadingPlayerHistory(false);
      }
    }

    void loadPlayerHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedPlayerId, selectedTeamId]);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  const selectedTeam = useMemo(() => {
    return teams.find((team) => team.id === selectedTeamId) ?? null;
  }, [teams, selectedTeamId]);

  const selectedPlayer = useMemo(() => {
    return teamPlayers.find((player) => player.id === selectedPlayerId) ?? null;
  }, [selectedPlayerId, teamPlayers]);

  const todayMadrid = useMemo(() => getCurrentMadridCivilDate(), []);

  const selectedBaselineConfigurationEvents = useMemo(() => {
    if (!selectedTeamId || !selectedPlayerId) return [];

    return sortBaselineConfigurationEventsDescending(
      baselineConfigurationEvents.filter(
        (event) =>
          event.teamId === selectedTeamId &&
          event.playerId === selectedPlayerId &&
          event.metric === selectedHistoryMetric,
      ),
    );
  }, [
    baselineConfigurationEvents,
    selectedHistoryMetric,
    selectedPlayerId,
    selectedTeamId,
  ]);

  const currentBaselineConfigurationEvent = useMemo(() => {
    if (!selectedTeamId || !selectedPlayerId) return null;

    return resolveBaselineConfigurationAtDate({
      events: selectedBaselineConfigurationEvents,
      teamId: selectedTeamId,
      playerId: selectedPlayerId,
      metric: selectedHistoryMetric,
      date: todayMadrid,
    });
  }, [
    selectedBaselineConfigurationEvents,
    selectedHistoryMetric,
    selectedPlayerId,
    selectedTeamId,
    todayMadrid,
  ]);

  const nextBaselineConfigurationEvent = useMemo(() => {
    if (!selectedTeamId || !selectedPlayerId) return null;

    return getNextBaselineConfigurationEvent({
      events: selectedBaselineConfigurationEvents,
      teamId: selectedTeamId,
      playerId: selectedPlayerId,
      metric: selectedHistoryMetric,
      date: todayMadrid,
    });
  }, [
    selectedBaselineConfigurationEvents,
    selectedHistoryMetric,
    selectedPlayerId,
    selectedTeamId,
    todayMadrid,
  ]);

  async function handleBaselineConfigurationCreated(
    event: NeuromuscularBaselineConfigurationEvent,
    submittedContext: BaselineConfigurationUiContext,
  ): Promise<void> {
    if (
      event.teamId !== submittedContext.teamId ||
      event.playerId !== submittedContext.playerId ||
      event.metric !== submittedContext.metric ||
      !isSameBaselineConfigurationUiContext(
        latestBaselineConfigurationContextRef.current,
        submittedContext,
      )
    ) {
      return;
    }

    try {
      const events = await loadPlayerNeuromuscularBaselineConfigurationEvents({
        teamId: submittedContext.teamId,
        playerId: submittedContext.playerId,
      });

      if (
        !isSameBaselineConfigurationUiContext(
          latestBaselineConfigurationContextRef.current,
          submittedContext,
        )
      ) {
        return;
      }

      setBaselineConfigurationEvents(events);
      setBaselineConfigurationEventsError(null);
      setBaselineConfigurationMessage({
        variant: "success",
        text: "Configuración guardada correctamente.",
      });
      setIsBaselineConfigurationOpen(false);
    } catch {
      if (
        !isSameBaselineConfigurationUiContext(
          latestBaselineConfigurationContextRef.current,
          submittedContext,
        )
      ) {
        return;
      }

      setBaselineConfigurationEvents((currentEvents) =>
        sortBaselineConfigurationEventsDescending([
          event,
          ...currentEvents.filter((currentEvent) => currentEvent.id !== event.id),
        ]),
      );
      setBaselineConfigurationEventsError(
        "No se pudo verificar el historial recargado tras guardar la configuración del baseline.",
      );
      setBaselineConfigurationMessage({
        variant: "warning",
        text: "La configuración se guardó, pero no se pudo verificar el historial recargado.",
      });
      setIsBaselineConfigurationOpen(false);
    }
  }

  const playerLossSeries = useMemo(
    () =>
      calculateNeuromuscularLosses(
        playerHistory,
        undefined,
        undefined,
        baselineConfigurationEvents,
      ),
    [baselineConfigurationEvents, playerHistory],
  );

  const playerReadinessSeries = useMemo(
    () => calculateNeuromuscularReadinessFromLossSeries(playerLossSeries),
    [playerLossSeries],
  );

  const selectedPlayerReadinessSeries = useMemo(() => {
    const matchingSeries = playerReadinessSeries.filter(
      (series) =>
        series.teamId === selectedTeamId &&
        series.playerId === selectedPlayerId,
    );

    return matchingSeries.length === 1 ? matchingSeries[0] : null;
  }, [playerReadinessSeries, selectedPlayerId, selectedTeamId]);

  const selectedHistoryMetricMatches = useMemo(
    () =>
      playerLossSeries.filter(
        (series) =>
          series.teamId === selectedTeamId &&
          series.playerId === selectedPlayerId &&
          series.metric === selectedHistoryMetric,
      ),
    [playerLossSeries, selectedHistoryMetric, selectedPlayerId, selectedTeamId],
  );

  const selectedHistoryMetricSeries =
    selectedHistoryMetricMatches.length === 1
      ? selectedHistoryMetricMatches[0]
      : null;

  const latestPlayerReadiness =
    selectedPlayerReadinessSeries?.latestAvailableReadinessPoint ?? null;

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
      .sort(
        (a, b) => Number(b.deltaPercent ?? -999) - Number(a.deltaPercent ?? -999),
      );
  }, [records, selectedVariable]);

  const quickNeuromuscularCards = useMemo<QuickReadingCard[]>(() => {
    function getVariableSummary(variable: NeuromuscularVariableKey) {
      const preAverage = getAverage(
        records.map((row) => getVariableValue(row, variable, "pre")),
      );
      const postAverage = getAverage(
        records.map((row) => getVariableValue(row, variable, "post")),
      );
      const deltaPercent =
        isFiniteNumber(preAverage) &&
        isFiniteNumber(postAverage) &&
        preAverage !== 0
          ? ((postAverage - preAverage) / preAverage) * 100
          : null;

      return { preAverage, postAverage, deltaPercent };
    }

    const cmjSummary = getVariableSummary("cmj");
    const rsiSummary = getVariableSummary("rsimod");
    const vmpSummary = getVariableSummary("vmp");
    const cmjMessage =
      isFiniteNumber(cmjSummary.preAverage) ||
      isFiniteNumber(cmjSummary.postAverage)
        ? `En los últimos registros disponibles, la media CMJ es ${formatVariableValue(
            cmjSummary.preAverage,
            "cmj",
          )} PRE y ${formatVariableValue(
            cmjSummary.postAverage,
            "cmj",
          )} POST, con una variación media de ${formatPercent(
            cmjSummary.deltaPercent,
          )}. Describe la respuesta de esta sesión, no un estado absoluto.`
        : "Los últimos registros disponibles no contienen valores CMJ suficientes para una lectura media.";
    const reactivityParts: string[] = [];

    if (
      isFiniteNumber(rsiSummary.preAverage) ||
      isFiniteNumber(rsiSummary.postAverage)
    ) {
      reactivityParts.push(
        `RSI mod: ${formatVariableValue(
          rsiSummary.preAverage,
          "rsimod",
        )} PRE, ${formatVariableValue(
          rsiSummary.postAverage,
          "rsimod",
        )} POST y ${formatPercent(rsiSummary.deltaPercent)} de variación media.`,
      );
    }

    if (
      isFiniteNumber(vmpSummary.preAverage) ||
      isFiniteNumber(vmpSummary.postAverage)
    ) {
      reactivityParts.push(
        `VMP: ${formatVariableValue(
          vmpSummary.preAverage,
          "vmp",
        )} PRE, ${formatVariableValue(
          vmpSummary.postAverage,
          "vmp",
        )} POST y ${formatPercent(vmpSummary.deltaPercent)} de variación media.`,
      );
    }

    if (isFiniteNumber(rpeAverage)) {
      reactivityParts.push(
        `El RPE medio disponible es ${formatNumber(rpeAverage, 1)}.`,
      );
    }

    const reactivityMessage =
      reactivityParts.length > 0
        ? reactivityParts.join(" ") +
          " Conviene interpretar estas variables junto a la tarea realizada y la carga previa."
        : "No hay valores suficientes de RSI modificado, VMP o RPE para una lectura conjunta.";
    const negativeDeltaCounts = {
      cmj: records.filter((row) => {
        const value = getDeltaPercent(row, "cmj");
        return isFiniteNumber(value) && value < 0;
      }).length,
      rsimod: records.filter((row) => {
        const value = getDeltaPercent(row, "rsimod");
        return isFiniteNumber(value) && value < 0;
      }).length,
      vmp: records.filter((row) => {
        const value = getDeltaPercent(row, "vmp");
        return isFiniteNumber(value) && value < 0;
      }).length,
    };
    const incompleteRecords = records.filter((row) =>
      variableOptions.some(
        ({ key }) =>
          !isFiniteNumber(getVariableValue(row, key, "pre")) ||
          !isFiniteNumber(getVariableValue(row, key, "post")),
      ),
    ).length;
    const negativeParts = [
      negativeDeltaCounts.cmj > 0
        ? `CMJ (${negativeDeltaCounts.cmj})`
        : null,
      negativeDeltaCounts.rsimod > 0
        ? `RSI mod (${negativeDeltaCounts.rsimod})`
        : null,
      negativeDeltaCounts.vmp > 0
        ? `VMP (${negativeDeltaCounts.vmp})`
        : null,
    ].filter((value): value is string => Boolean(value));
    const alertMessages = [
      negativeParts.length > 0
        ? `Hay variaciones PRE-POST negativas en ${negativeParts.join(
            ", ",
          )}; deben revisarse individualmente y en contexto.`
        : "No aparecen variaciones PRE-POST negativas entre los registros completos de esta sesión.",
      incompleteRecords > 0
        ? `${incompleteRecords} de ${
            records.length
          } registros no incluyen PRE y POST completos en CMJ, RSI modificado y VMP.`
        : "Los registros incluyen PRE y POST completos para las tres variables.",
      "La comparación utiliza el PRE de la sesión y no constituye una referencia longitudinal individual.",
    ];
    const hasAlert = negativeParts.length > 0 || incompleteRecords > 0;
    const recommendationMessage = hasAlert
      ? "Revisar los casos señalados, confirmar la calidad del registro y cruzar CMJ, RSI modificado, VMP y RPE con GPS y próximos controles; una variación aislada no diagnostica fatiga, lesión ni riesgo."
      : "Mantener el seguimiento individual y cruzar CMJ, RSI modificado, VMP y RPE con GPS y próximos controles antes de ajustar la carga.";

    return [
      {
        title: "Estado CMJ",
        variant:
          isFiniteNumber(cmjSummary.deltaPercent) &&
          cmjSummary.deltaPercent < 0
            ? "warning"
            : "info",
        message: cmjMessage,
      },
      {
        title: "Reactividad · RSI y VMP",
        variant: "info",
        message: reactivityMessage,
      },
      {
        title: "Alertas y referencia",
        variant: hasAlert ? "warning" : "info",
        message: alertMessages.join(" "),
      },
      {
        title: "Recomendación para el staff",
        variant: hasAlert ? "warning" : "info",
        message: recommendationMessage,
      },
    ];
  }, [records, rpeAverage]);

  return (
    <AppShell
      title="Rendimiento neuromuscular"
      subtitle="Consulta las sesiones neuromusculares cargadas desde CSV y analiza la respuesta PRE-POST en CMJ, RSI modificado y VMP."
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Sesiones guardadas
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Seleccionar sesión neuromuscular
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Selecciona una sesión para visualizar los registros importados.
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {selectedTeam
                  ? `Mostrando sesiones de ${getTeamLabel(selectedTeam)}.`
                  : "Selecciona un equipo para evitar mezclar datos neuromusculares."}
              </p>
            </div>

            <div className="grid min-w-0 w-full gap-3 md:w-[480px]">
              <label
                htmlFor="neuromuscular-team"
                className="text-sm font-bold text-slate-700"
              >
                Equipo
                <select
                  id="neuromuscular-team"
                  value={selectedTeamId}
                  onChange={(event) => {
                    void handleTeamChange(event.target.value);
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={loadingSessions || teams.length === 0}
                >
                  <option value="">Selecciona equipo</option>

                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {getTeamLabel(team)}
                    </option>
                  ))}
                </select>
              </label>

              <label
                htmlFor="neuromuscular-session"
                className="text-sm font-bold text-slate-700"
              >
                Sesión
                <select
                  id="neuromuscular-session"
                  value={selectedSessionId}
                  onChange={(event) => setSelectedSessionId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={
                    loadingSessions || !selectedTeamId || sessions.length === 0
                  }
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

              <label
                htmlFor="neuromuscular-player"
                className="text-sm font-bold text-slate-700"
              >
                Jugador para resumen longitudinal
                <select
                  id="neuromuscular-player"
                  value={selectedPlayerId}
                  onChange={(event) => {
                    const nextPlayerId = event.target.value;

                    setIsBaselineConfigurationOpen(false);
                    setBaselineConfigurationMessage(null);
                    setSelectedPlayerId(nextPlayerId);
                    setPlayerHistory([]);
                    setPlayerHistoryError(null);
                    setBaselineConfigurationEvents([]);
                    setBaselineConfigurationEventsError(null);
                    setLoadingPlayerHistory(nextPlayerId !== "");
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={
                    !selectedTeamId ||
                    loadingPlayers ||
                    teamPlayers.length === 0
                  }
                >
                  <option value="">
                    {!selectedTeamId
                      ? "Selecciona equipo primero"
                      : loadingPlayers
                        ? "Cargando jugadores..."
                        : "Selecciona jugador"}
                  </option>

                  {teamPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-6">
              <StatusMessage
                variant="error"
                title="No se ha podido cargar rendimiento neuromuscular"
              >
                {error}
              </StatusMessage>
            </div>
          )}

          {loadingSessions && (
            <div className="mt-6">
              <StatusMessage
                variant="info"
                title="Cargando sesiones neuromusculares"
              >
                Cargando sesiones neuromusculares guardadas en Supabase.
              </StatusMessage>
            </div>
          )}

          {!loadingSessions && teams.length === 0 && (
            <div className="mt-6">
              <StatusMessage
                variant="warning"
                title="No hay equipos disponibles"
              >
                Crea o confirma un equipo antes de consultar datos
                neuromusculares por equipo.
              </StatusMessage>
            </div>
          )}

          {!loadingSessions && teams.length > 1 && !selectedTeamId && (
            <div className="mt-6">
              <StatusMessage variant="warning" title="Selecciona un equipo">
                Para evitar mezclar datos de varios equipos, selecciona un
                equipo antes de mostrar sesiones, jugadores, rankings, gráficos
                y lectura rápida neuromuscular.
              </StatusMessage>
            </div>
          )}

          {!loadingSessions && selectedTeamId && sessions.length === 0 && (
            <div className="mt-6">
              <EmptyState
                title="Sin sesiones neuromusculares"
                description="Todavía no hay sesiones neuromusculares guardadas. Primero sube una sesión desde la página de carga neuromuscular."
              />
            </div>
          )}

          {selectedSession && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Fecha</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.session_date}
                </p>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Microciclo</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.microcycle ?? "N/A"}
                </p>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Nombre</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.session_name ?? "Sesión neuromuscular"}
                </p>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Registros</p>
                <p className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                  {records.length}
                </p>
              </div>
            </div>
          )}
        </section>

        <section aria-label="Resumen longitudinal individual">
          {!selectedTeamId ? (
            <StatusMessage variant="info" title="Readiness individual">
              Selecciona un equipo para consultar el readiness individual.
            </StatusMessage>
          ) : loadingPlayers ? (
            <StatusMessage variant="info" title="Cargando jugadores">
              Cargando los jugadores activos del equipo seleccionado.
            </StatusMessage>
          ) : playersError ? (
            <StatusMessage variant="error" title="No se han podido cargar los jugadores">
              {playersError}
            </StatusMessage>
          ) : teamPlayers.length === 0 ? (
            <EmptyState
              title="Sin jugadores activos"
              description="No hay jugadores activos disponibles en este equipo."
            />
          ) : !selectedPlayerId ? (
            <StatusMessage variant="info" title="Selecciona un jugador">
              Selecciona un jugador para consultar su evolución neuromuscular.
            </StatusMessage>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label
                  htmlFor="neuromuscular-history-metric"
                  className="block text-sm font-bold text-slate-700"
                >
                  Métrica longitudinal
                  <select
                    id="neuromuscular-history-metric"
                    value={selectedHistoryMetric}
                    onChange={(event) =>
                      {
                        setIsBaselineConfigurationOpen(false);
                        setBaselineConfigurationMessage(null);
                        setSelectedHistoryMetric(
                          event.target.value as NeuromuscularMetric,
                        );
                      }
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 sm:max-w-sm"
                  >
                    <option value="CMJ">CMJ</option>
                    <option value="RSIMOD">RSI modificado</option>
                    <option value="VMP">VMP</option>
                  </select>
                </label>
                <p className="mt-2 text-sm text-slate-600">
                  El gráfico usa el histórico PRE del jugador seleccionado y no
                  modifica el análisis de sesión.
                </p>
              </div>

              {!loadingUserRole &&
                selectedPlayer &&
                (userRole === "admin" || userRole === "staff") && (
                  <div className="space-y-4">
                    {!isBaselineConfigurationOpen ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBaselineConfigurationMessage(null);
                          setIsBaselineConfigurationOpen(true);
                        }}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        Configurar baseline
                      </button>
                    ) : (
                      <BaselineConfigurationForm
                        key={`${selectedPlayerId}-${selectedHistoryMetric}`}
                        playerId={selectedPlayerId}
                        playerName={selectedPlayer.name}
                        metric={selectedHistoryMetric}
                        role={userRole}
                        onClose={() => setIsBaselineConfigurationOpen(false)}
                        onCreated={(event) =>
                          handleBaselineConfigurationCreated(event, {
                            teamId: selectedTeamId,
                            playerId: selectedPlayerId,
                            metric: selectedHistoryMetric,
                          })
                        }
                      />
                    )}
                  </div>
                )}

              {baselineConfigurationMessage && (
                <StatusMessage variant={baselineConfigurationMessage.variant}>
                  {baselineConfigurationMessage.text}
                </StatusMessage>
              )}

              <BaselineConfigurationHistory
                key={`${selectedTeamId}-${selectedPlayerId}-${selectedHistoryMetric}`}
                events={selectedBaselineConfigurationEvents}
                metric={selectedHistoryMetric}
                todayMadrid={todayMadrid}
                currentEvent={currentBaselineConfigurationEvent}
                nextEvent={nextBaselineConfigurationEvent}
                loading={loadingPlayerHistory}
                loadError={
                  selectedBaselineConfigurationEvents.length > 0
                    ? null
                    : baselineConfigurationEventsError
                }
              />

              {loadingPlayerHistory ? (
                <StatusMessage variant="info" title="Cargando histórico individual">
                  Cargando los registros PRE del jugador seleccionado.
                </StatusMessage>
              ) : playerHistoryError ? (
                <StatusMessage variant="error" title="No se ha podido cargar el histórico individual">
                  {playerHistoryError}
                </StatusMessage>
              ) : playerHistory.length === 0 ? (
                <EmptyState
                  title="Sin registros neuromusculares vinculados"
                  description="Este jugador todavía no tiene registros neuromusculares vinculados."
                />
              ) : (
                <>
                  {latestPlayerReadiness && selectedPlayer ? (
                    <NeuromuscularReadinessSummary
                      playerName={selectedPlayer.name}
                      readinessPoint={latestPlayerReadiness}
                    />
                  ) : (
                    <StatusMessage variant="info" title="Readiness todavía no disponible">
                      Todavía no hay suficientes mediciones PRE puntuables para calcular
                      el readiness. El baseline individual requiere una referencia
                      longitudinal y el resumen necesita al menos dos métricas puntuables
                      en un mismo registro.
                    </StatusMessage>
                  )}

                  {selectedHistoryMetricMatches.length > 1 ? (
                <StatusMessage variant="error" title="Serie longitudinal inconsistente">
                  Se han encontrado varias series para la misma métrica del jugador.
                  Revisa la integridad del histórico antes de interpretarlo.
                </StatusMessage>
              ) : selectedHistoryMetricSeries ? (
                <NeuromuscularMetricHistorySection
                  key={`${selectedTeamId}:${selectedPlayerId}`}
                  series={selectedHistoryMetricSeries}
                />
              ) : (
                <EmptyState
                  title={`Sin registros PRE de ${getHistoryMetricLabel(
                    selectedHistoryMetric,
                  )}`}
                    description={`Este jugador todavía no tiene registros PRE de ${getHistoryMetricLabel(
                      selectedHistoryMetric,
                    )}.`}
                  />
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {selectedSessionId && (
          <section>
            {loadingRecords ? (
              <StatusMessage
                variant="info"
                title="Cargando registros neuromusculares"
              >
                Cargando registros de la sesión seleccionada.
              </StatusMessage>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard title="Jugadores" value={records.length} />

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

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SummaryCard
                    title="RPE medio"
                    value={formatNumber(rpeAverage, 1)}
                  />

                  <SummaryCard
                    title="Registros con CMJ POST"
                    value={
                      records.filter((row) => isFiniteNumber(row.cmj_post))
                        .length
                    }
                  />

                  <SummaryCard
                    title="Registros con VMP POST"
                    value={
                      records.filter((row) => isFiniteNumber(row.vmp_post))
                        .length
                    }
                  />
                </div>

                {records.length > 0 && (
                  <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                      Interpretación neuromuscular
                    </p>

                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      Lectura rápida neuromuscular
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Señales orientativas a partir de los últimos registros
                      disponibles de la sesión seleccionada.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {quickNeuromuscularCards.map((card) => (
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

                <div className="mt-8 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                        Análisis PRE-POST
                      </p>

                      <h2 className="mt-2 text-xl font-black text-slate-950">
                        Comparación por variable
                      </h2>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        Visualiza el valor PRE y POST de cada jugador en la
                        sesión seleccionada.
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

                  <div className="mt-6 h-[340px] min-w-0 w-full sm:h-[440px]">
                    {chartData.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <EmptyState
                          title="Sin datos PRE/POST"
                          description="No hay datos PRE/POST disponibles para esta variable."
                        />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{
                            top: 10,
                            right: 12,
                            left: 8,
                            bottom: 10,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />

                          <XAxis
                            type="number"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) =>
                              Number(value).toLocaleString("es-ES")
                            }
                          />

                          <YAxis
                            type="category"
                            dataKey="jugador"
                            width={84}
                            tick={{
                              fontSize: 11,
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
                          <Bar
                            dataKey="post"
                            name="POST"
                            radius={[0, 8, 8, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                  <div className="border-b border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-xl font-black text-slate-950">
                      Ranking de cambio PRE-POST
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Ordenado por el mayor cambio porcentual en{" "}
                      {selectedVariableMeta.label}.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 md:hidden">
                    {deltaRows.map((row) => (
                      <article key={row.id} className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-black text-slate-950">
                              {row.playerName}
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {row.position ?? "Sin posición"} ·{" "}
                              {selectedVariableMeta.label}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${getDeltaClass(
                              row.deltaPercent,
                            )}`}
                          >
                            {formatPercent(row.deltaPercent)}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              PRE
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatVariableValue(row.pre, selectedVariable)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              POST
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatVariableValue(row.post, selectedVariable)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Cambio absoluto
                            </p>
                            <p
                              className={`mt-1 w-fit rounded-full px-3 py-1 text-xs font-black ${getDeltaClass(
                                row.delta,
                              )}`}
                            >
                              {formatVariableValue(row.delta, selectedVariable)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Cambio %
                            </p>
                            <p
                              className={`mt-1 w-fit rounded-full px-3 py-1 text-xs font-black ${getDeltaClass(
                                row.deltaPercent,
                              )}`}
                            >
                              {formatPercent(row.deltaPercent)}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}

                    {deltaRows.length === 0 && (
                      <div className="p-5">
                        <EmptyState
                          title="Sin registros PRE-POST"
                          description="No hay registros disponibles para esta variable."
                        />
                      </div>
                    )}
                  </div>

                  <div className="hidden max-h-[440px] overflow-auto md:block">
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

                            <td className="px-4 py-3">{row.position ?? "—"}</td>

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
                                {formatVariableValue(row.delta, selectedVariable)}
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

                        {deltaRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6">
                              <EmptyState
                                title="Sin registros PRE-POST"
                                description="No hay registros disponibles para esta variable."
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                  <div className="border-b border-slate-200 p-5">
                    <h2 className="text-xl font-black text-slate-950">
                      Registros neuromusculares por jugador
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Tabla completa de la sesión neuromuscular seleccionada.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 md:hidden">
                    {records.map((row) => (
                      <article key={row.id} className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-black text-slate-950">
                              {row.player_name}
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {row.position ?? "Sin posición"}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                            RPE {formatNumber(row.rpe, 0)}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              CMJ PRE
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatVariableValue(row.cmj_pre, "cmj")}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              CMJ POST
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatVariableValue(row.cmj_post, "cmj")}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              RSI PRE
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatVariableValue(row.rsimod_pre, "rsimod")}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              RSI POST
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatVariableValue(row.rsimod_post, "rsimod")}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              VMP PRE
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatVariableValue(row.vmp_pre, "vmp")}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              VMP POST
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatVariableValue(row.vmp_post, "vmp")}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Carga sentadilla
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {isFiniteNumber(row.squat_load_kg)
                                ? `${formatNumber(row.squat_load_kg, 0)} kg`
                                : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              RPE
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatNumber(row.rpe, 0)}
                            </p>
                          </div>
                        </div>

                        {row.notes && (
                          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Notas
                            </p>

                            <p className="mt-1 break-words text-sm font-bold text-slate-700">
                              {row.notes}
                            </p>
                          </div>
                        )}
                      </article>
                    ))}

                    {records.length === 0 && (
                      <div className="p-5">
                        <EmptyState
                          title="Sin registros neuromusculares"
                          description="No hay registros neuromusculares para esta sesión."
                        />
                      </div>
                    )}
                  </div>

                  <div className="hidden max-h-[560px] overflow-auto md:block">
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

                            <td className="px-4 py-3">{row.position ?? "—"}</td>

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

                            <td className="px-4 py-3">{row.notes ?? "—"}</td>
                          </tr>
                        ))}

                        {records.length === 0 && (
                          <tr>
                            <td colSpan={11} className="px-4 py-6">
                              <EmptyState
                                title="Sin registros neuromusculares"
                                description="No hay registros neuromusculares para esta sesión."
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
