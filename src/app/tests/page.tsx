"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Acceleration5ExecutionForm from "@/components/tests/Acceleration5ExecutionForm";
import DropJumpExecutionForm, {
  type DropJumpFormState,
} from "@/components/tests/DropJumpExecutionForm";
import IllinoisExecutionForm from "@/components/tests/IllinoisExecutionForm";
import HipThrustVmpExecutionForm from "@/components/tests/HipThrustVmpExecutionForm";
import LoadVelocityProfileExecutionForm from "@/components/tests/LoadVelocityProfileExecutionForm";
import Rsa6x30ExecutionForm from "@/components/tests/Rsa6x30ExecutionForm";
import SquatVmpExecutionForm from "@/components/tests/SquatVmpExecutionForm";
import Sprint30ExecutionForm from "@/components/tests/Sprint30ExecutionForm";
import ThirtyFifteenExecutionForm from "@/components/tests/ThirtyFifteenExecutionForm";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
import { TEST_DEFINITIONS, type TestCategory } from "@/lib/domain/performance";
import {
  createEmptyTestExecutionDraft,
  isTestExecutionContextComplete,
  type TestExecutionDraft,
  type TestExecutionStage,
} from "@/lib/domain/test-execution";
import {
  ACCELERATION_5M_ATTEMPT_VARIABLES,
  ACCELERATION_5M_TEST_CATEGORY,
  ACCELERATION_5M_TEST_ID,
  ACCELERATION_5M_TEST_NAME,
  ACCELERATION_5M_UNIT_ATTEMPT,
  ACCELERATION_5M_UNIT_PERCENTAGE,
  ACCELERATION_5M_UNIT_TIME,
  ACCELERATION_5M_VARIABLES,
  type Acceleration5mFormState,
  type Acceleration5mSummary,
} from "@/lib/domain/tests/acceleration-5m";
import {
  calculateAbalakovSummary,
  ABALAKOV_DEVICE,
  ABALAKOV_MAX_ATTEMPTS,
  ABALAKOV_TEST_CATEGORY,
  ABALAKOV_TEST_ID,
  ABALAKOV_TEST_NAME,
  ABALAKOV_UNIT_ASYMMETRY,
  ABALAKOV_UNIT_BODY_MASS,
  ABALAKOV_UNIT_HEIGHT,
  ABALAKOV_VARIABLES,
  getAbalakovAttemptVariable,
  modalityIncludesAbalakovBipodal,
  modalityIncludesAbalakovUnipodal,
  parsePositiveAbalakovNumber,
  validateAbalakovExecutionInput,
  type AbalakovAttemptSide,
  type AbalakovModality,
} from "@/lib/domain/tests/abalakov";
import {
  calculateCmjSummary,
  CMJ_DEVICE,
  CMJ_MAX_ATTEMPTS,
  CMJ_TEST_CATEGORY,
  CMJ_TEST_ID,
  CMJ_TEST_NAME,
  CMJ_UNIT_ASYMMETRY,
  CMJ_UNIT_BODY_MASS,
  CMJ_UNIT_HEIGHT,
  CMJ_VARIABLES,
  getCmjAttemptVariable,
  modalityIncludesBipodal,
  modalityIncludesUnipodal,
  parsePositiveCmjNumber,
  validateCmjExecutionInput,
  type CmjAttemptSide,
  type CmjModality,
} from "@/lib/domain/tests/cmj";
import {
  DROP_JUMP_DEVICE,
  DROP_JUMP_TEST_CATEGORY,
  DROP_JUMP_TEST_ID,
  DROP_JUMP_TEST_NAME,
  DROP_JUMP_UNIT_ASYMMETRY,
  DROP_JUMP_UNIT_BODY_MASS,
  DROP_JUMP_UNIT_CONTACT,
  DROP_JUMP_UNIT_HEIGHT,
  DROP_JUMP_UNIT_RSI,
  DROP_JUMP_VARIABLES,
  getDropJumpAttemptContactVariable,
  getDropJumpAttemptHeightVariable,
  getDropJumpAttemptRsiVariable,
  getValidDropJumpAttempts,
  modalityIncludesDropJumpBipodal,
  modalityIncludesDropJumpUnipodal,
  parsePositiveDropJumpNumber,
  type DropJumpAttemptInput,
  type DropJumpAttemptSide,
  type DropJumpSummary,
  type DropJumpValidAttempt,
} from "@/lib/domain/tests/drop-jump";
import {
  calculateSjSummary,
  SJ_DEVICE,
  SJ_MAX_ATTEMPTS,
  SJ_TEST_CATEGORY,
  SJ_TEST_ID,
  SJ_TEST_NAME,
  SJ_UNIT_ASYMMETRY,
  SJ_UNIT_BODY_MASS,
  SJ_UNIT_HEIGHT,
  SJ_VARIABLES,
  getSjAttemptVariable,
  modalityIncludesSjBipodal,
  modalityIncludesSjUnipodal,
  parsePositiveSjNumber,
  validateSjExecutionInput,
  type SjAttemptSide,
  type SjModality,
} from "@/lib/domain/tests/sj";
import {
  THIRTY_FIFTEEN_IFT_TEST_CATEGORY,
  THIRTY_FIFTEEN_IFT_TEST_ID,
  THIRTY_FIFTEEN_IFT_TEST_NAME,
  THIRTY_FIFTEEN_IFT_UNIT_SPEED,
  THIRTY_FIFTEEN_IFT_VARIABLES,
  type ThirtyFifteenIftFormState,
  type ThirtyFifteenIftSummary,
} from "@/lib/domain/tests/thirty-fifteen-ift";
import {
  createLoadVelocityProfileResults,
  LOAD_VELOCITY_PROFILE_DEVICE,
  LOAD_VELOCITY_PROFILE_TEST_CATEGORY,
  LOAD_VELOCITY_PROFILE_TEST_ID,
  LOAD_VELOCITY_PROFILE_TEST_NAME,
  type LoadVelocityProfileFormState,
  type LoadVelocityProfileSummary,
} from "@/lib/domain/tests/load-velocity-profile";
import {
  createHipThrustVmpResults,
  HIP_THRUST_VMP_DEVICE,
  HIP_THRUST_VMP_TEST_CATEGORY,
  HIP_THRUST_VMP_TEST_ID,
  HIP_THRUST_VMP_TEST_NAME,
  type HipThrustVmpFormState,
  type HipThrustVmpSummary,
} from "@/lib/domain/tests/hip-thrust-vmp";
import {
  ILLINOIS_ATTEMPT_VARIABLES,
  ILLINOIS_TEST_CATEGORY,
  ILLINOIS_TEST_ID,
  ILLINOIS_TEST_NAME,
  ILLINOIS_UNIT_ATTEMPT,
  ILLINOIS_UNIT_PERCENTAGE,
  ILLINOIS_UNIT_TIME,
  ILLINOIS_VARIABLES,
  type IllinoisFormState,
  type IllinoisSummary,
} from "@/lib/domain/tests/illinois";
import {
  RSA_6X30_SPRINT_VARIABLES,
  RSA_6X30_TEST_CATEGORY,
  RSA_6X30_TEST_ID,
  RSA_6X30_TEST_NAME,
  RSA_6X30_UNIT_PERCENTAGE,
  RSA_6X30_UNIT_TIME,
  RSA_6X30_VARIABLES,
  type Rsa6x30FormState,
  type Rsa6x30Summary,
} from "@/lib/domain/tests/rsa-6x30";
import {
  createSquatVmpResults,
  SQUAT_VMP_DEVICE,
  SQUAT_VMP_TEST_CATEGORY,
  SQUAT_VMP_TEST_ID,
  SQUAT_VMP_TEST_NAME,
  type SquatVmpFormState,
  type SquatVmpSummary,
} from "@/lib/domain/tests/squat-vmp";
import {
  getSprint30Attempt30mVariable,
  getSprint30Attempt5mVariable,
  SPRINT_30M_TEST_CATEGORY,
  SPRINT_30M_TEST_ID,
  SPRINT_30M_TEST_NAME,
  SPRINT_30M_UNIT_ATTEMPT,
  SPRINT_30M_UNIT_TIME,
  SPRINT_30M_VARIABLES,
  type Sprint30FormState,
  type Sprint30Summary,
} from "@/lib/domain/tests/sprint-30m";
import {
  createTestSessionWithResults,
  getTestPlayersByTeamId,
  getTestResultsBySessionId,
  getTestScoresBySessionId,
  getTestSessionsFromSupabase,
  getTestTeamsFromSupabase,
  type TestRecordInput,
  type TestPlayerRow,
  type TestResultRow,
  type TestScoreRow,
  type TestSessionRow,
  type TestTeamRow,
} from "@/lib/supabase/tests";

function getTeamLabel(team: TestTeamRow) {
  const details = [team.category, team.season]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" · ");

  return details ? `${team.name} · ${details}` : team.name;
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

function formatValue(value: number | null | undefined, unit: string | null) {
  if (value === null || value === undefined) return "—";

  const formatted = formatNumber(value, 2);

  return unit ? `${formatted} ${unit}` : formatted;
}

function formatExecutionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getClassificationClass(classification: string | null | undefined) {
  const text = String(classification ?? "").toLowerCase();

  if (
    text.includes("excelente") ||
    text.includes("óptimo") ||
    text.includes("optimo") ||
    text.includes("muy alto") ||
    text.includes("alto") ||
    text.includes("bueno") ||
    text.includes("ok")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    text.includes("medio") ||
    text.includes("moderado") ||
    text.includes("aceptable") ||
    text.includes("normal")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    text.includes("bajo") ||
    text.includes("deficiente") ||
    text.includes("riesgo") ||
    text.includes("malo") ||
    text.includes("insuficiente")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getUniquePlayers(
  rows: Array<{ normalized_name: string; player_name: string }>,
) {
  const players = new Map<string, string>();

  rows.forEach((row) => {
    players.set(row.normalized_name, row.player_name);
  });

  return players;
}

type QuickReadingCard = {
  title: string;
  variant: "info" | "warning";
  message: string;
};

type TestsView = "catalog" | "history";

type CatalogTest = {
  category: TestCategory;
  name: string;
};

type CatalogMessage = {
  title: string;
  variant: "success" | "error" | "info" | "warning";
  message: string;
};

type JumpModality = AbalakovModality | CmjModality | SjModality;
type JumpAttemptSide = AbalakovAttemptSide | CmjAttemptSide | SjAttemptSide;

type JumpFormState = {
  performedAt: string;
  bodyMassKg: string;
  modality: JumpModality;
  bipodalAttempts: string[];
  rightAttempts: string[];
  leftAttempts: string[];
};

const TEST_VIEW_OPTIONS = [
  { id: "catalog", label: "Realizar tests" },
  { id: "history", label: "Resultados e histórico" },
] as const satisfies readonly { id: TestsView; label: string }[];

const TEST_CATALOG_GROUPS = TEST_DEFINITIONS.map((group) => ({
  category: group.category,
  tests: group.tests.map((name) => ({
    category: group.category,
    name,
  })),
}));

function getCatalogTestKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function getCatalogTestId(test: CatalogTest) {
  return `${test.category}:${getCatalogTestKey(test.name)}`;
}

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialCmjForm(): JumpFormState {
  return {
    performedAt: getTodayDateInputValue(),
    bodyMassKg: "",
    modality: "BIPODAL",
    bipodalAttempts: [""],
    rightAttempts: [""],
    leftAttempts: [""],
  };
}

function createInitialSjForm(): JumpFormState {
  return {
    performedAt: getTodayDateInputValue(),
    bodyMassKg: "",
    modality: "BIPODAL",
    bipodalAttempts: [""],
    rightAttempts: [""],
    leftAttempts: [""],
  };
}

function createInitialAbalakovForm(): JumpFormState {
  return {
    performedAt: getTodayDateInputValue(),
    bodyMassKg: "",
    modality: "BIPODAL",
    bipodalAttempts: [""],
    rightAttempts: [""],
    leftAttempts: [""],
  };
}

function isCmjCatalogTest(test: CatalogTest | null) {
  return getCatalogTestKey(test?.name ?? "") === CMJ_TEST_ID;
}

function isSjCatalogTest(test: CatalogTest | null) {
  return getCatalogTestKey(test?.name ?? "") === SJ_TEST_ID;
}

function isAbalakovCatalogTest(test: CatalogTest | null) {
  return getCatalogTestKey(test?.name ?? "") === ABALAKOV_TEST_ID;
}

function isDropJumpCatalogTest(test: CatalogTest | null) {
  return getCatalogTestKey(test?.name ?? "") === DROP_JUMP_TEST_ID;
}

function isThirtyFifteenIftCatalogTest(test: CatalogTest | null) {
  return getCatalogTestKey(test?.name ?? "") === THIRTY_FIFTEEN_IFT_TEST_ID;
}

function isRsa6x30CatalogTest(test: CatalogTest | null) {
  return (
    getCatalogTestKey(test?.name ?? "").replace(/\s+/g, "") ===
    RSA_6X30_TEST_ID.replace(/\s+/g, "")
  );
}

function isSprint30CatalogTest(test: CatalogTest | null) {
  return (
    getCatalogTestKey(test?.name ?? "").replace(/\s+/g, "") ===
    SPRINT_30M_TEST_ID.replace(/\s+/g, "")
  );
}

function isAcceleration5mCatalogTest(test: CatalogTest | null) {
  return (
    getCatalogTestKey(test?.name ?? "").replace(/\s+/g, "") ===
    ACCELERATION_5M_TEST_ID.replace(/\s+/g, "")
  );
}

function isIllinoisCatalogTest(test: CatalogTest | null) {
  return getCatalogTestKey(test?.name ?? "").includes(ILLINOIS_TEST_ID);
}

function isSquatVmpCatalogTest(test: CatalogTest | null) {
  return getCatalogTestKey(test?.name ?? "") === SQUAT_VMP_TEST_ID;
}

function isHipThrustVmpCatalogTest(test: CatalogTest | null) {
  return getCatalogTestKey(test?.name ?? "") === HIP_THRUST_VMP_TEST_ID;
}
function isLoadVelocityProfileCatalogTest(test: CatalogTest | null) { return getCatalogTestKey(test?.name ?? "") === LOAD_VELOCITY_PROFILE_TEST_ID; }

function getCatalogTestName(name: string) {
  const key = getCatalogTestKey(name);

  if (key.includes("PERFIL CARGA")) return "Perfil carga-velocidad";
  if (key.includes("PERFIL FUERZA")) return "Perfil fuerza-velocidad";
  if (key.includes("VMP SENTADILLA")) return "VMP sentadilla";
  if (key.includes("VMP HIP THRUST")) return "VMP hip thrust";
  if (key.includes("SPRINT 30")) return "Sprint 30 m";
  if (key.includes("ACELERACI")) return "Aceleración 5 m";
  if (key.includes("ABALAKOV")) return "Abalakov";
  if (key.includes("DROP JUMP")) return "Drop Jump";
  if (key.includes("30-15")) return "30-15 IFT";
  if (key.includes("RSA")) return "RSA 6 × 30 m";
  if (key.includes("ILLINOIS")) return "Illinois Test";
  if (key === "CMJ" || key === "SJ") return key;

  return name;
}

function getCatalogTestDescription(name: string) {
  const key = getCatalogTestKey(name);

  if (key.includes("PERFIL CARGA")) {
    return "Relación orientativa entre carga externa y velocidad de ejecución.";
  }

  if (key.includes("PERFIL FUERZA")) {
    return "Lectura inicial del perfil fuerza-velocidad con datos disponibles.";
  }

  if (key.includes("VMP SENTADILLA")) {
    return "Registro de velocidad media propulsiva en sentadilla.";
  }

  if (key.includes("VMP HIP THRUST")) {
    return "Registro de velocidad media propulsiva en hip thrust.";
  }

  if (key.includes("SPRINT 30")) {
    return "Medición de velocidad lineal en 30 metros.";
  }

  if (key.includes("ACELERACI")) {
    return "Medición de aceleración inicial en 5 metros.";
  }

  if (key === "CMJ") {
    return "Salto con contramovimiento para valorar expresión neuromuscular.";
  }

  if (key === "SJ") {
    return "Salto sin contramovimiento para observar componente concéntrico.";
  }

  if (key.includes("ABALAKOV")) {
    return "Salto con acción libre de brazos para observar capacidad de salto.";
  }

  if (key.includes("DROP JUMP")) {
    return "Salto reactivo para observar respuesta elástica y contacto.";
  }

  if (key.includes("30-15")) {
    return "Prueba intermitente para estimar capacidad aeróbica específica.";
  }

  if (key.includes("RSA")) {
    return "Repetición de sprints para observar tolerancia a esfuerzos repetidos.";
  }

  if (key.includes("ILLINOIS")) {
    return "Prueba de agilidad con cambios de dirección.";
  }

  return "Test disponible para preparar una toma de datos posterior.";
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
      <p className="text-xs font-bold text-slate-500">{title}</p>

      <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs font-bold text-slate-500">{description}</p>
      )}
    </div>
  );
}

function ClassificationBadge({
  classification,
}: {
  classification: string | null | undefined;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getClassificationClass(
        classification,
      )}`}
    >
      {classification ?? "Sin clasificar"}
    </span>
  );
}

export default function TestsPage() {
  const [teams, setTeams] = useState<TestTeamRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [sessions, setSessions] = useState<TestSessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [results, setResults] = useState<TestResultRow[]>([]);
  const [scores, setScores] = useState<TestScoreRow[]>([]);

  const [selectedCapacity, setSelectedCapacity] = useState("all");
  const [activeView, setActiveView] = useState<TestsView>("catalog");
  const [teamPlayers, setTeamPlayers] = useState<TestPlayerRow[]>([]);
  const [loadingTeamPlayers, setLoadingTeamPlayers] = useState(false);
  const [selectedCatalogTest, setSelectedCatalogTest] =
    useState<CatalogTest | null>(null);
  const [selectedCatalogPlayerId, setSelectedCatalogPlayerId] = useState("");
  const [executionStage, setExecutionStage] =
    useState<TestExecutionStage>("CATALOG");
  const [executionDraft, setExecutionDraft] =
    useState<TestExecutionDraft | null>(null);
  const [cmjForm, setCmjForm] = useState<JumpFormState>(createInitialCmjForm);
  const [cmjErrors, setCmjErrors] = useState<string[]>([]);
  const [savingCmj, setSavingCmj] = useState(false);
  const [sjForm, setSjForm] = useState<JumpFormState>(createInitialSjForm);
  const [sjErrors, setSjErrors] = useState<string[]>([]);
  const [savingSj, setSavingSj] = useState(false);
  const [abalakovForm, setAbalakovForm] = useState<JumpFormState>(
    createInitialAbalakovForm,
  );
  const [abalakovErrors, setAbalakovErrors] = useState<string[]>([]);
  const [savingAbalakov, setSavingAbalakov] = useState(false);
  const [savingDropJump, setSavingDropJump] = useState(false);
  const [savingThirtyFifteenIft, setSavingThirtyFifteenIft] = useState(false);
  const [savingRsa6x30, setSavingRsa6x30] = useState(false);
  const [savingSprint30, setSavingSprint30] = useState(false);
  const [savingAcceleration5m, setSavingAcceleration5m] = useState(false);
  const [savingIllinois, setSavingIllinois] = useState(false);
  const [savingSquatVmp, setSavingSquatVmp] = useState(false);
  const [savingHipThrustVmp, setSavingHipThrustVmp] = useState(false);
  const [savingLoadVelocityProfile, setSavingLoadVelocityProfile] = useState(false);
  const [catalogMessage, setCatalogMessage] =
    useState<CatalogMessage | null>(null);

  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingJumpTest =
    savingCmj ||
    savingSj ||
    savingAbalakov ||
    savingDropJump ||
    savingThirtyFifteenIft ||
    savingRsa6x30 ||
    savingSprint30 ||
    savingAcceleration5m ||
    savingIllinois ||
    savingSquatVmp ||
    savingHipThrustVmp || savingLoadVelocityProfile;
  const sessionsRequestId = useRef(0);
  const catalogPlayersRequestId = useRef(0);

  async function loadSessionsForTeam(teamId: string, preferredSessionId = "") {
    const requestId = sessionsRequestId.current + 1;
    sessionsRequestId.current = requestId;

    if (!teamId) {
      setSessions([]);
      setSelectedSessionId("");
      return;
    }

    const data = await getTestSessionsFromSupabase(teamId);

    if (requestId !== sessionsRequestId.current) {
      return;
    }

    setSessions(data);
    setSelectedSessionId(
      data.some((session) => session.id === preferredSessionId)
        ? preferredSessionId
        : data[0]?.id ?? "",
    );
  }

  function resetCmjState() {
    setCmjForm(createInitialCmjForm());
    setCmjErrors([]);
    setSavingCmj(false);
  }

  function resetSjState() {
    setSjForm(createInitialSjForm());
    setSjErrors([]);
    setSavingSj(false);
  }

  function resetAbalakovState() {
    setAbalakovForm(createInitialAbalakovForm());
    setAbalakovErrors([]);
    setSavingAbalakov(false);
  }

  function resetDropJumpState() {
    setSavingDropJump(false);
  }

  function resetThirtyFifteenIftState() {
    setSavingThirtyFifteenIft(false);
  }

  function resetRsa6x30State() {
    setSavingRsa6x30(false);
  }

  function resetSprint30State() {
    setSavingSprint30(false);
  }

  function resetAcceleration5mState() {
    setSavingAcceleration5m(false);
  }

  function resetIllinoisState() {
    setSavingIllinois(false);
  }

  function resetSquatVmpState() {
    setSavingSquatVmp(false);
  }

  function resetHipThrustVmpState() {
    setSavingHipThrustVmp(false);
  }
  function resetLoadVelocityProfileState() { setSavingLoadVelocityProfile(false); }

  function resetJumpTestState() {
    resetCmjState();
    resetSjState();
    resetAbalakovState();
    resetDropJumpState();
    resetThirtyFifteenIftState();
    resetRsa6x30State();
    resetSprint30State();
    resetAcceleration5mState();
    resetIllinoisState();
    resetSquatVmpState();
    resetHipThrustVmpState();
    resetLoadVelocityProfileState();
  }

  useEffect(() => {
    async function loadInitialTestsData() {
      try {
        setLoadingSessions(true);
        setError(null);

        const teamsData = await getTestTeamsFromSupabase();
        const [onlyTeam] = teamsData;
        const resolvedTeamId =
          teamsData.length === 1 && onlyTeam ? onlyTeam.id : "";

        setTeams(teamsData);
        setSelectedTeamId(resolvedTeamId);
        setResults([]);
        setScores([]);
        setSelectedCapacity("all");

        await loadSessionsForTeam(resolvedTeamId);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar las sesiones de tests.";

        setError(message);
      } finally {
        setLoadingSessions(false);
      }
    }

    loadInitialTestsData();
  }, []);

  async function handleTeamChange(teamId: string) {
    if (savingJumpTest) return;

    try {
      setLoadingSessions(true);
      setError(null);
      setSelectedTeamId(teamId);
      setSessions([]);
      setSelectedSessionId("");
      setResults([]);
      setScores([]);
      setSelectedCapacity("all");
      catalogPlayersRequestId.current += 1;
      setTeamPlayers([]);
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCatalogMessage(null);
      setLoadingTeamPlayers(false);
      setLoadingData(false);
      resetJumpTestState();

      await loadSessionsForTeam(teamId);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar las sesiones de tests.";

      setError(message);
    } finally {
      setLoadingSessions(false);
    }
  }

  function handleViewChange(view: TestsView) {
    if (savingJumpTest) return;

    setActiveView(view);

    if (view === "history") {
      catalogPlayersRequestId.current += 1;
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCatalogMessage(null);
      setLoadingTeamPlayers(false);
      resetJumpTestState();
    }
  }

  async function handleOpenCatalogTest(test: CatalogTest) {
    if (savingJumpTest) return;

    if (!selectedTeamId) {
      setCatalogMessage({
        variant: "warning",
        title: "Selecciona un equipo",
        message:
          "Elige un equipo antes de abrir un test para trabajar solo con sus jugadores activos.",
      });
      return;
    }

    setCatalogMessage(null);
    setSelectedCatalogTest(test);
    setSelectedCatalogPlayerId("");
    setExecutionStage("SETUP");
    setExecutionDraft(null);
    setTeamPlayers([]);
    resetJumpTestState();

    const requestId = catalogPlayersRequestId.current + 1;
    catalogPlayersRequestId.current = requestId;

    try {
      setLoadingTeamPlayers(true);

      const playersData = await getTestPlayersByTeamId(selectedTeamId);

      if (requestId !== catalogPlayersRequestId.current) {
        return;
      }

      setTeamPlayers(playersData);
    } catch (err) {
      if (requestId !== catalogPlayersRequestId.current) {
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar jugadores del equipo.";

      setCatalogMessage({
        variant: "warning",
        title: "No se han podido cargar jugadores",
        message,
      });
    } finally {
      if (requestId === catalogPlayersRequestId.current) {
        setLoadingTeamPlayers(false);
      }
    }
  }

  function handleBackToCatalog() {
    if (savingJumpTest) return;

    catalogPlayersRequestId.current += 1;
    setSelectedCatalogTest(null);
    setSelectedCatalogPlayerId("");
    setExecutionStage("CATALOG");
    setExecutionDraft(null);
    setCatalogMessage(null);
    setLoadingTeamPlayers(false);
    resetJumpTestState();
  }

  function handleContinueCatalogTest() {
    if (savingJumpTest) return;

    if (!selectedCatalogTest || !selectedCatalogPlayerId) {
      setCatalogMessage({
        variant: "warning",
        title: "Selecciona un jugador",
        message:
          "Elige un jugador activo del equipo antes de continuar con el test.",
      });
      return;
    }

    const context = {
      teamId: selectedTeamId,
      playerId: selectedCatalogPlayerId,
      testId: getCatalogTestId(selectedCatalogTest),
      testName: getCatalogTestName(selectedCatalogTest.name),
      testCategory: selectedCatalogTest.category,
      performedAt: new Date().toISOString(),
    };

    if (!isTestExecutionContextComplete(context)) {
      setCatalogMessage({
        variant: "warning",
        title: "Contexto incompleto",
        message:
          "Revisa equipo, jugador y test seleccionado antes de continuar.",
      });
      return;
    }

    setExecutionDraft(createEmptyTestExecutionDraft(context));
    setExecutionStage("EXECUTION");
    setCmjForm(createInitialCmjForm());
    setCmjErrors([]);
    setSjForm(createInitialSjForm());
    setSjErrors([]);
    setAbalakovForm(createInitialAbalakovForm());
    setAbalakovErrors([]);
    setCatalogMessage(null);
  }

  function handleBackToTestSetup() {
    if (savingJumpTest) return;

    setExecutionStage("SETUP");
    setCatalogMessage(null);
  }

  function handleCancelExecution() {
    if (savingJumpTest) return;

    catalogPlayersRequestId.current += 1;
    setSelectedCatalogTest(null);
    setSelectedCatalogPlayerId("");
    setExecutionStage("CATALOG");
    setExecutionDraft(null);
    setCatalogMessage(null);
    setLoadingTeamPlayers(false);
    resetJumpTestState();
  }

  function updateCmjAttempts(
    side: CmjAttemptSide,
    updater: (attempts: string[]) => string[],
  ) {
    setCmjForm((currentForm) => {
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

  function handleCmjAttemptChange(
    side: CmjAttemptSide,
    index: number,
    value: string,
  ) {
    updateCmjAttempts(side, (attempts) =>
      attempts.map((attempt, attemptIndex) =>
        attemptIndex === index ? value : attempt,
      ),
    );
  }

  function handleAddCmjAttempt(side: CmjAttemptSide) {
    updateCmjAttempts(side, (attempts) =>
      attempts.length >= CMJ_MAX_ATTEMPTS ? attempts : [...attempts, ""],
    );
  }

  function handleRemoveCmjAttempt(side: CmjAttemptSide, index: number) {
    updateCmjAttempts(side, (attempts) =>
      attempts.length <= 1
        ? attempts
        : attempts.filter((_, attemptIndex) => attemptIndex !== index),
    );
  }

  function handleReviewCmj() {
    if (!executionDraft || !isTestExecutionContextComplete(executionDraft.context)) {
      setCmjErrors(["El contexto de ejecución está incompleto."]);
      return;
    }

    if (!selectedCatalogPlayer) {
      setCmjErrors(["Selecciona un jugador activo antes de revisar el CMJ."]);
      return;
    }

    const validationErrors = validateCmjExecutionInput({
      bodyMassKg: cmjForm.bodyMassKg,
      modality: cmjForm.modality,
      bipodalAttempts: cmjForm.bipodalAttempts,
      rightAttempts: cmjForm.rightAttempts,
      leftAttempts: cmjForm.leftAttempts,
    });

    if (!cmjForm.performedAt) {
      validationErrors.unshift("La fecha del test es obligatoria.");
    }

    if (validationErrors.length > 0) {
      setCmjErrors(validationErrors);
      return;
    }

    setExecutionDraft({
      ...executionDraft,
      context: {
        ...executionDraft.context,
        performedAt: cmjForm.performedAt,
      },
    });
    setCmjErrors([]);
    setCatalogMessage(null);
    setExecutionStage("REVIEW");
  }

  function appendCmjAttemptRecords(
    records: TestRecordInput[],
    side: CmjAttemptSide,
    attempts: readonly string[],
    player: TestPlayerRow,
  ) {
    attempts.forEach((attempt, index) => {
      const value = parsePositiveCmjNumber(attempt);

      if (value === null) return;

      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: CMJ_TEST_NAME,
        variable: getCmjAttemptVariable(side, index + 1),
        value,
        unit: CMJ_UNIT_HEIGHT,
        direction: side,
        source: CMJ_DEVICE,
      });
    });
  }

  function buildCmjRecords(player: TestPlayerRow): TestRecordInput[] {
    const bodyMassKg = parsePositiveCmjNumber(cmjForm.bodyMassKg);
    const records: TestRecordInput[] = [
      {
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: CMJ_TEST_NAME,
        variable: CMJ_VARIABLES.BODY_MASS,
        value: bodyMassKg,
        unit: CMJ_UNIT_BODY_MASS,
        direction: cmjForm.modality,
        source: CMJ_DEVICE,
      },
    ];

    if (modalityIncludesBipodal(cmjForm.modality)) {
      appendCmjAttemptRecords(
        records,
        "BIPODAL",
        cmjForm.bipodalAttempts,
        player,
      );
    }

    if (modalityIncludesUnipodal(cmjForm.modality)) {
      appendCmjAttemptRecords(records, "DERECHA", cmjForm.rightAttempts, player);
      appendCmjAttemptRecords(
        records,
        "IZQUIERDA",
        cmjForm.leftAttempts,
        player,
      );
    }

    if (cmjSummary.bestBipodal !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: CMJ_TEST_NAME,
        variable: CMJ_VARIABLES.BEST_BIPODAL,
        value: cmjSummary.bestBipodal,
        unit: CMJ_UNIT_HEIGHT,
        direction: "BIPODAL",
        source: CMJ_DEVICE,
      });
    }

    if (cmjSummary.bestRight !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: CMJ_TEST_NAME,
        variable: CMJ_VARIABLES.BEST_RIGHT,
        value: cmjSummary.bestRight,
        unit: CMJ_UNIT_HEIGHT,
        direction: "DERECHA",
        source: CMJ_DEVICE,
      });
    }

    if (cmjSummary.bestLeft !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: CMJ_TEST_NAME,
        variable: CMJ_VARIABLES.BEST_LEFT,
        value: cmjSummary.bestLeft,
        unit: CMJ_UNIT_HEIGHT,
        direction: "IZQUIERDA",
        source: CMJ_DEVICE,
      });
    }

    if (cmjSummary.asymmetry !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: CMJ_TEST_NAME,
        variable: CMJ_VARIABLES.ASYMMETRY,
        value: cmjSummary.asymmetry,
        unit: CMJ_UNIT_ASYMMETRY,
        direction: cmjSummary.bestSide,
        source: CMJ_DEVICE,
      });
    }

    if (cmjSummary.bestSide !== "NO_APLICA") {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: CMJ_TEST_NAME,
        variable: CMJ_VARIABLES.BEST_SIDE,
        value: null,
        unit: null,
        direction: cmjSummary.bestSide,
        source: CMJ_DEVICE,
      });
    }

    return records;
  }

  async function handleSaveCmj() {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar el CMJ",
        message: "Faltan equipo, jugador o contexto de ejecución.",
      });
      return;
    }

    const validationErrors = validateCmjExecutionInput({
      bodyMassKg: cmjForm.bodyMassKg,
      modality: cmjForm.modality,
      bipodalAttempts: cmjForm.bipodalAttempts,
      rightAttempts: cmjForm.rightAttempts,
      leftAttempts: cmjForm.leftAttempts,
    });

    if (!cmjForm.performedAt) {
      validationErrors.unshift("La fecha del test es obligatoria.");
    }

    if (validationErrors.length > 0) {
      setCmjErrors(validationErrors);
      setExecutionStage("EXECUTION");
      return;
    }

    try {
      setSavingCmj(true);
      setCatalogMessage(null);

      const bodyMassKg = parsePositiveCmjNumber(cmjForm.bodyMassKg);
      const saved = await createTestSessionWithResults({
        team_id: selectedTeamId,
        session_date: cmjForm.performedAt,
        session_name: `${CMJ_TEST_NAME} - ${
          selectedCatalogPlayer.name
        } - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: `${CMJ_TEST_NAME} ejecutado con ${CMJ_DEVICE}. Modalidad: ${cmjForm.modality}.`,
        tests: [
          {
            id: CMJ_TEST_ID,
            name: CMJ_TEST_NAME,
            category: CMJ_TEST_CATEGORY,
            device: CMJ_DEVICE,
            modality: cmjForm.modality,
            bodyMassKg,
            summary: cmjSummary,
          },
        ],
        records: buildCmjRecords(selectedCatalogPlayer),
        skipScores: true,
      });

      await loadSessionsForTeam(selectedTeamId, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCmjErrors([]);
      setCatalogMessage({
        variant: "success",
        title: "CMJ guardado",
        message:
          "Se han guardado los intentos válidos y los mejores resultados del CMJ. El histórico del equipo se ha recargado automáticamente.",
      });
      resetCmjState();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar el CMJ.";

      setCatalogMessage({
        variant: "error",
        title: "No se ha podido guardar el CMJ",
        message,
      });
    } finally {
      setSavingCmj(false);
    }
  }

  function updateSjAttempts(
    side: SjAttemptSide,
    updater: (attempts: string[]) => string[],
  ) {
    setSjForm((currentForm) => {
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

  function handleSjAttemptChange(
    side: SjAttemptSide,
    index: number,
    value: string,
  ) {
    updateSjAttempts(side, (attempts) =>
      attempts.map((attempt, attemptIndex) =>
        attemptIndex === index ? value : attempt,
      ),
    );
  }

  function handleAddSjAttempt(side: SjAttemptSide) {
    updateSjAttempts(side, (attempts) =>
      attempts.length >= SJ_MAX_ATTEMPTS ? attempts : [...attempts, ""],
    );
  }

  function handleRemoveSjAttempt(side: SjAttemptSide, index: number) {
    updateSjAttempts(side, (attempts) =>
      attempts.length <= 1
        ? attempts
        : attempts.filter((_, attemptIndex) => attemptIndex !== index),
    );
  }

  function handleReviewSj() {
    if (!executionDraft || !isTestExecutionContextComplete(executionDraft.context)) {
      setSjErrors(["El contexto de ejecucion esta incompleto."]);
      return;
    }

    if (!selectedCatalogPlayer) {
      setSjErrors(["Selecciona un jugador activo antes de revisar el SJ."]);
      return;
    }

    const validationErrors = validateSjExecutionInput({
      bodyMassKg: sjForm.bodyMassKg,
      modality: sjForm.modality as SjModality,
      bipodalAttempts: sjForm.bipodalAttempts,
      rightAttempts: sjForm.rightAttempts,
      leftAttempts: sjForm.leftAttempts,
    });

    if (!sjForm.performedAt) {
      validationErrors.unshift("La fecha del test es obligatoria.");
    }

    if (validationErrors.length > 0) {
      setSjErrors(validationErrors);
      return;
    }

    setExecutionDraft({
      ...executionDraft,
      context: {
        ...executionDraft.context,
        performedAt: sjForm.performedAt,
      },
    });
    setSjErrors([]);
    setCatalogMessage(null);
    setExecutionStage("REVIEW");
  }

  function appendSjAttemptRecords(
    records: TestRecordInput[],
    side: SjAttemptSide,
    attempts: readonly string[],
    player: TestPlayerRow,
  ) {
    attempts.forEach((attempt, index) => {
      const value = parsePositiveSjNumber(attempt);

      if (value === null) return;

      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: SJ_TEST_NAME,
        variable: getSjAttemptVariable(side, index + 1),
        value,
        unit: SJ_UNIT_HEIGHT,
        direction: side,
        source: SJ_DEVICE,
      });
    });
  }

  function buildSjRecords(
    player: TestPlayerRow,
    form: JumpFormState,
    summary: ReturnType<typeof calculateSjSummary>,
  ): TestRecordInput[] {
    const modality = form.modality as SjModality;
    const bodyMassKg = parsePositiveSjNumber(form.bodyMassKg);
    const records: TestRecordInput[] = [
      {
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: SJ_TEST_NAME,
        variable: SJ_VARIABLES.BODY_MASS,
        value: bodyMassKg,
        unit: SJ_UNIT_BODY_MASS,
        direction: modality,
        source: SJ_DEVICE,
      },
    ];

    if (modalityIncludesSjBipodal(modality)) {
      appendSjAttemptRecords(records, "BIPODAL", form.bipodalAttempts, player);
    }

    if (modalityIncludesSjUnipodal(modality)) {
      appendSjAttemptRecords(records, "DERECHA", form.rightAttempts, player);
      appendSjAttemptRecords(records, "IZQUIERDA", form.leftAttempts, player);
    }

    if (summary.bestBipodal !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: SJ_TEST_NAME,
        variable: SJ_VARIABLES.BEST_BIPODAL,
        value: summary.bestBipodal,
        unit: SJ_UNIT_HEIGHT,
        direction: "BIPODAL",
        source: SJ_DEVICE,
      });
    }

    if (summary.bestRight !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: SJ_TEST_NAME,
        variable: SJ_VARIABLES.BEST_RIGHT,
        value: summary.bestRight,
        unit: SJ_UNIT_HEIGHT,
        direction: "DERECHA",
        source: SJ_DEVICE,
      });
    }

    if (summary.bestLeft !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: SJ_TEST_NAME,
        variable: SJ_VARIABLES.BEST_LEFT,
        value: summary.bestLeft,
        unit: SJ_UNIT_HEIGHT,
        direction: "IZQUIERDA",
        source: SJ_DEVICE,
      });
    }

    if (summary.asymmetry !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: SJ_TEST_NAME,
        variable: SJ_VARIABLES.ASYMMETRY,
        value: summary.asymmetry,
        unit: SJ_UNIT_ASYMMETRY,
        direction: summary.bestSide,
        source: SJ_DEVICE,
      });
    }

    if (summary.bestSide !== "NO_APLICA") {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: SJ_TEST_NAME,
        variable: SJ_VARIABLES.BEST_SIDE,
        value: null,
        unit: null,
        direction: summary.bestSide,
        source: SJ_DEVICE,
      });
    }

    return records;
  }

  async function handleSaveSj() {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar el SJ",
        message: "Faltan equipo, jugador o contexto de ejecucion.",
      });
      return;
    }

    const formSnapshot = {
      ...sjForm,
      bipodalAttempts: [...sjForm.bipodalAttempts],
      rightAttempts: [...sjForm.rightAttempts],
      leftAttempts: [...sjForm.leftAttempts],
    };
    const playerSnapshot = selectedCatalogPlayer;
    const teamIdSnapshot = selectedTeamId;
    const sjSummarySnapshot = calculateSjSummary({
      bodyMassKg: formSnapshot.bodyMassKg,
      modality: formSnapshot.modality as SjModality,
      bipodalAttempts: formSnapshot.bipodalAttempts,
      rightAttempts: formSnapshot.rightAttempts,
      leftAttempts: formSnapshot.leftAttempts,
    });
    const validationErrors = validateSjExecutionInput({
      bodyMassKg: formSnapshot.bodyMassKg,
      modality: formSnapshot.modality as SjModality,
      bipodalAttempts: formSnapshot.bipodalAttempts,
      rightAttempts: formSnapshot.rightAttempts,
      leftAttempts: formSnapshot.leftAttempts,
    });

    if (!formSnapshot.performedAt) {
      validationErrors.unshift("La fecha del test es obligatoria.");
    }

    if (validationErrors.length > 0) {
      setSjErrors(validationErrors);
      setExecutionStage("EXECUTION");
      return;
    }

    try {
      setSavingSj(true);
      setCatalogMessage(null);

      const bodyMassKg = parsePositiveSjNumber(formSnapshot.bodyMassKg);
      const saved = await createTestSessionWithResults({
        team_id: teamIdSnapshot,
        session_date: formSnapshot.performedAt,
        session_name: `${SJ_TEST_NAME} - ${
          playerSnapshot.name
        } - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: `${SJ_TEST_NAME} ejecutado con ${SJ_DEVICE}. Modalidad: ${formSnapshot.modality}.`,
        tests: [
          {
            id: SJ_TEST_ID,
            name: SJ_TEST_NAME,
            category: SJ_TEST_CATEGORY,
            device: SJ_DEVICE,
            modality: formSnapshot.modality,
            bodyMassKg,
            summary: sjSummarySnapshot,
          },
        ],
        records: buildSjRecords(playerSnapshot, formSnapshot, sjSummarySnapshot),
        skipScores: true,
      });

      await loadSessionsForTeam(teamIdSnapshot, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setSjErrors([]);
      setCatalogMessage({
        variant: "success",
        title: "SJ guardado",
        message:
          "Se han guardado los intentos validos y los mejores resultados del SJ. El historico del equipo se ha recargado automaticamente.",
      });
      resetSjState();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar el SJ.";

      setCatalogMessage({
        variant: "error",
        title: "No se ha podido guardar el SJ",
        message,
      });
    } finally {
      setSavingSj(false);
    }
  }

  function updateAbalakovAttempts(
    side: AbalakovAttemptSide,
    updater: (attempts: string[]) => string[],
  ) {
    setAbalakovForm((currentForm) => {
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

  function handleAbalakovAttemptChange(
    side: AbalakovAttemptSide,
    index: number,
    value: string,
  ) {
    updateAbalakovAttempts(side, (attempts) =>
      attempts.map((attempt, attemptIndex) =>
        attemptIndex === index ? value : attempt,
      ),
    );
  }

  function handleAddAbalakovAttempt(side: AbalakovAttemptSide) {
    updateAbalakovAttempts(side, (attempts) =>
      attempts.length >= ABALAKOV_MAX_ATTEMPTS ? attempts : [...attempts, ""],
    );
  }

  function handleRemoveAbalakovAttempt(
    side: AbalakovAttemptSide,
    index: number,
  ) {
    updateAbalakovAttempts(side, (attempts) =>
      attempts.length <= 1
        ? attempts
        : attempts.filter((_, attemptIndex) => attemptIndex !== index),
    );
  }

  function handleReviewAbalakov() {
    if (!executionDraft || !isTestExecutionContextComplete(executionDraft.context)) {
      setAbalakovErrors(["El contexto de ejecucion esta incompleto."]);
      return;
    }

    if (!selectedCatalogPlayer) {
      setAbalakovErrors([
        "Selecciona un jugador activo antes de revisar el Abalakov.",
      ]);
      return;
    }

    const validationErrors = validateAbalakovExecutionInput({
      bodyMassKg: abalakovForm.bodyMassKg,
      modality: abalakovForm.modality as AbalakovModality,
      bipodalAttempts: abalakovForm.bipodalAttempts,
      rightAttempts: abalakovForm.rightAttempts,
      leftAttempts: abalakovForm.leftAttempts,
    });

    if (!abalakovForm.performedAt) {
      validationErrors.unshift("La fecha del test es obligatoria.");
    }

    if (validationErrors.length > 0) {
      setAbalakovErrors(validationErrors);
      return;
    }

    setExecutionDraft({
      ...executionDraft,
      context: {
        ...executionDraft.context,
        performedAt: abalakovForm.performedAt,
      },
    });
    setAbalakovErrors([]);
    setCatalogMessage(null);
    setExecutionStage("REVIEW");
  }

  function appendAbalakovAttemptRecords(
    records: TestRecordInput[],
    side: AbalakovAttemptSide,
    attempts: readonly string[],
    player: TestPlayerRow,
  ) {
    attempts.forEach((attempt, index) => {
      const value = parsePositiveAbalakovNumber(attempt);

      if (value === null) return;

      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: ABALAKOV_TEST_NAME,
        variable: getAbalakovAttemptVariable(side, index + 1),
        value,
        unit: ABALAKOV_UNIT_HEIGHT,
        direction: side,
        source: ABALAKOV_DEVICE,
      });
    });
  }

  function buildAbalakovRecords(
    player: TestPlayerRow,
    form: JumpFormState,
    summary: ReturnType<typeof calculateAbalakovSummary>,
  ): TestRecordInput[] {
    const modality = form.modality as AbalakovModality;
    const bodyMassKg = parsePositiveAbalakovNumber(form.bodyMassKg);
    const records: TestRecordInput[] = [
      {
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: ABALAKOV_TEST_NAME,
        variable: ABALAKOV_VARIABLES.BODY_MASS,
        value: bodyMassKg,
        unit: ABALAKOV_UNIT_BODY_MASS,
        direction: modality,
        source: ABALAKOV_DEVICE,
      },
    ];

    if (modalityIncludesAbalakovBipodal(modality)) {
      appendAbalakovAttemptRecords(
        records,
        "BIPODAL",
        form.bipodalAttempts,
        player,
      );
    }

    if (modalityIncludesAbalakovUnipodal(modality)) {
      appendAbalakovAttemptRecords(
        records,
        "DERECHA",
        form.rightAttempts,
        player,
      );
      appendAbalakovAttemptRecords(
        records,
        "IZQUIERDA",
        form.leftAttempts,
        player,
      );
    }

    if (summary.bestBipodal !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: ABALAKOV_TEST_NAME,
        variable: ABALAKOV_VARIABLES.BEST_BIPODAL,
        value: summary.bestBipodal,
        unit: ABALAKOV_UNIT_HEIGHT,
        direction: "BIPODAL",
        source: ABALAKOV_DEVICE,
      });
    }

    if (summary.bestRight !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: ABALAKOV_TEST_NAME,
        variable: ABALAKOV_VARIABLES.BEST_RIGHT,
        value: summary.bestRight,
        unit: ABALAKOV_UNIT_HEIGHT,
        direction: "DERECHA",
        source: ABALAKOV_DEVICE,
      });
    }

    if (summary.bestLeft !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: ABALAKOV_TEST_NAME,
        variable: ABALAKOV_VARIABLES.BEST_LEFT,
        value: summary.bestLeft,
        unit: ABALAKOV_UNIT_HEIGHT,
        direction: "IZQUIERDA",
        source: ABALAKOV_DEVICE,
      });
    }

    if (summary.asymmetry !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: ABALAKOV_TEST_NAME,
        variable: ABALAKOV_VARIABLES.ASYMMETRY,
        value: summary.asymmetry,
        unit: ABALAKOV_UNIT_ASYMMETRY,
        direction: summary.bestSide,
        source: ABALAKOV_DEVICE,
      });
    }

    if (summary.bestSide !== "NO_APLICA") {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: ABALAKOV_TEST_NAME,
        variable: ABALAKOV_VARIABLES.BEST_SIDE,
        value: null,
        unit: null,
        direction: summary.bestSide,
        source: ABALAKOV_DEVICE,
      });
    }

    return records;
  }

  async function handleSaveAbalakov() {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar el Abalakov",
        message: "Faltan equipo, jugador o contexto de ejecucion.",
      });
      return;
    }

    const formSnapshot = {
      ...abalakovForm,
      bipodalAttempts: [...abalakovForm.bipodalAttempts],
      rightAttempts: [...abalakovForm.rightAttempts],
      leftAttempts: [...abalakovForm.leftAttempts],
    };
    const playerSnapshot = selectedCatalogPlayer;
    const teamIdSnapshot = selectedTeamId;
    const abalakovSummarySnapshot = calculateAbalakovSummary({
      bodyMassKg: formSnapshot.bodyMassKg,
      modality: formSnapshot.modality as AbalakovModality,
      bipodalAttempts: formSnapshot.bipodalAttempts,
      rightAttempts: formSnapshot.rightAttempts,
      leftAttempts: formSnapshot.leftAttempts,
    });
    const validationErrors = validateAbalakovExecutionInput({
      bodyMassKg: formSnapshot.bodyMassKg,
      modality: formSnapshot.modality as AbalakovModality,
      bipodalAttempts: formSnapshot.bipodalAttempts,
      rightAttempts: formSnapshot.rightAttempts,
      leftAttempts: formSnapshot.leftAttempts,
    });

    if (!formSnapshot.performedAt) {
      validationErrors.unshift("La fecha del test es obligatoria.");
    }

    if (validationErrors.length > 0) {
      setAbalakovErrors(validationErrors);
      setExecutionStage("EXECUTION");
      return;
    }

    try {
      setSavingAbalakov(true);
      setCatalogMessage(null);

      const bodyMassKg = parsePositiveAbalakovNumber(formSnapshot.bodyMassKg);
      const saved = await createTestSessionWithResults({
        team_id: teamIdSnapshot,
        session_date: formSnapshot.performedAt,
        session_name: `${ABALAKOV_TEST_NAME} - ${
          playerSnapshot.name
        } - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: `${ABALAKOV_TEST_NAME} ejecutado con ${ABALAKOV_DEVICE}. Modalidad: ${formSnapshot.modality}.`,
        tests: [
          {
            id: ABALAKOV_TEST_ID,
            name: ABALAKOV_TEST_NAME,
            category: ABALAKOV_TEST_CATEGORY,
            device: ABALAKOV_DEVICE,
            modality: formSnapshot.modality,
            bodyMassKg,
            summary: abalakovSummarySnapshot,
          },
        ],
        records: buildAbalakovRecords(
          playerSnapshot,
          formSnapshot,
          abalakovSummarySnapshot,
        ),
        skipScores: true,
      });

      await loadSessionsForTeam(teamIdSnapshot, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setAbalakovErrors([]);
      setCatalogMessage({
        variant: "success",
        title: "Abalakov guardado",
        message:
          "Se han guardado los intentos validos y los mejores resultados del Abalakov. El historico del equipo se ha recargado automaticamente.",
      });
      resetAbalakovState();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar el Abalakov.";

      setCatalogMessage({
        variant: "error",
        title: "No se ha podido guardar el Abalakov",
        message,
      });
    } finally {
      setSavingAbalakov(false);
    }
  }

  function appendDropJumpAttemptRecords(
    records: TestRecordInput[],
    side: DropJumpAttemptSide,
    attempts: readonly DropJumpAttemptInput[],
    player: TestPlayerRow,
  ) {
    getValidDropJumpAttempts(attempts).forEach((attempt) => {
      records.push(
        {
          player_id: player.id,
          player_name: player.name,
          normalized_name: player.normalized_name,
          position: player.position,
          test_block: DROP_JUMP_TEST_NAME,
          variable: getDropJumpAttemptHeightVariable(
            side,
            attempt.attemptNumber,
          ),
          value: attempt.heightCm,
          unit: DROP_JUMP_UNIT_HEIGHT,
          direction: side,
          source: DROP_JUMP_DEVICE,
        },
        {
          player_id: player.id,
          player_name: player.name,
          normalized_name: player.normalized_name,
          position: player.position,
          test_block: DROP_JUMP_TEST_NAME,
          variable: getDropJumpAttemptContactVariable(
            side,
            attempt.attemptNumber,
          ),
          value: attempt.contactMs,
          unit: DROP_JUMP_UNIT_CONTACT,
          direction: side,
          source: DROP_JUMP_DEVICE,
        },
        {
          player_id: player.id,
          player_name: player.name,
          normalized_name: player.normalized_name,
          position: player.position,
          test_block: DROP_JUMP_TEST_NAME,
          variable: getDropJumpAttemptRsiVariable(side, attempt.attemptNumber),
          value: attempt.rsi,
          unit: DROP_JUMP_UNIT_RSI,
          direction: side,
          source: DROP_JUMP_DEVICE,
        },
      );
    });
  }

  function appendDropJumpBestRecords(
    records: TestRecordInput[],
    side: DropJumpAttemptSide,
    bestAttempt: DropJumpValidAttempt | null,
    player: TestPlayerRow,
  ) {
    if (!bestAttempt) return;

    const variablesBySide = {
      BIPODAL: {
        rsi: DROP_JUMP_VARIABLES.BEST_RSI_BIPODAL,
        height: DROP_JUMP_VARIABLES.BEST_HEIGHT_BIPODAL,
        contact: DROP_JUMP_VARIABLES.BEST_CONTACT_BIPODAL,
        attempt: DROP_JUMP_VARIABLES.BEST_ATTEMPT_BIPODAL,
      },
      DERECHA: {
        rsi: DROP_JUMP_VARIABLES.BEST_RSI_RIGHT,
        height: DROP_JUMP_VARIABLES.BEST_HEIGHT_RIGHT,
        contact: DROP_JUMP_VARIABLES.BEST_CONTACT_RIGHT,
        attempt: DROP_JUMP_VARIABLES.BEST_ATTEMPT_RIGHT,
      },
      IZQUIERDA: {
        rsi: DROP_JUMP_VARIABLES.BEST_RSI_LEFT,
        height: DROP_JUMP_VARIABLES.BEST_HEIGHT_LEFT,
        contact: DROP_JUMP_VARIABLES.BEST_CONTACT_LEFT,
        attempt: DROP_JUMP_VARIABLES.BEST_ATTEMPT_LEFT,
      },
    }[side];

    records.push(
      {
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: DROP_JUMP_TEST_NAME,
        variable: variablesBySide.rsi,
        value: bestAttempt.rsi,
        unit: DROP_JUMP_UNIT_RSI,
        direction: side,
        source: DROP_JUMP_DEVICE,
      },
      {
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: DROP_JUMP_TEST_NAME,
        variable: variablesBySide.height,
        value: bestAttempt.heightCm,
        unit: DROP_JUMP_UNIT_HEIGHT,
        direction: side,
        source: DROP_JUMP_DEVICE,
      },
      {
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: DROP_JUMP_TEST_NAME,
        variable: variablesBySide.contact,
        value: bestAttempt.contactMs,
        unit: DROP_JUMP_UNIT_CONTACT,
        direction: side,
        source: DROP_JUMP_DEVICE,
      },
      {
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: DROP_JUMP_TEST_NAME,
        variable: variablesBySide.attempt,
        value: bestAttempt.attemptNumber,
        unit: null,
        direction: side,
        source: DROP_JUMP_DEVICE,
      },
    );
  }

  function buildDropJumpRecords(
    player: TestPlayerRow,
    form: DropJumpFormState,
    summary: DropJumpSummary,
  ): TestRecordInput[] {
    const bodyMassKg = parsePositiveDropJumpNumber(form.bodyMassKg);
    const boxHeightCm = parsePositiveDropJumpNumber(form.boxHeightCm);
    const records: TestRecordInput[] = [
      {
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: DROP_JUMP_TEST_NAME,
        variable: DROP_JUMP_VARIABLES.BODY_MASS,
        value: bodyMassKg,
        unit: DROP_JUMP_UNIT_BODY_MASS,
        direction: form.modality,
        source: DROP_JUMP_DEVICE,
      },
      {
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: DROP_JUMP_TEST_NAME,
        variable: DROP_JUMP_VARIABLES.BOX_HEIGHT,
        value: boxHeightCm,
        unit: DROP_JUMP_UNIT_HEIGHT,
        direction: form.modality,
        source: DROP_JUMP_DEVICE,
      },
    ];

    if (modalityIncludesDropJumpBipodal(form.modality)) {
      appendDropJumpAttemptRecords(
        records,
        "BIPODAL",
        form.bipodalAttempts,
        player,
      );
      appendDropJumpBestRecords(records, "BIPODAL", summary.bestBipodal, player);
    }

    if (modalityIncludesDropJumpUnipodal(form.modality)) {
      appendDropJumpAttemptRecords(
        records,
        "DERECHA",
        form.rightAttempts,
        player,
      );
      appendDropJumpAttemptRecords(
        records,
        "IZQUIERDA",
        form.leftAttempts,
        player,
      );
      appendDropJumpBestRecords(records, "DERECHA", summary.bestRight, player);
      appendDropJumpBestRecords(
        records,
        "IZQUIERDA",
        summary.bestLeft,
        player,
      );
    }

    if (summary.asymmetry !== null) {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: DROP_JUMP_TEST_NAME,
        variable: DROP_JUMP_VARIABLES.ASYMMETRY,
        value: summary.asymmetry,
        unit: DROP_JUMP_UNIT_ASYMMETRY,
        direction: summary.bestSide,
        source: DROP_JUMP_DEVICE,
      });
    }

    if (summary.bestSide !== "NO_APLICA") {
      records.push({
        player_id: player.id,
        player_name: player.name,
        normalized_name: player.normalized_name,
        position: player.position,
        test_block: DROP_JUMP_TEST_NAME,
        variable: DROP_JUMP_VARIABLES.BEST_SIDE,
        value: null,
        unit: null,
        direction: summary.bestSide,
        source: DROP_JUMP_DEVICE,
      });
    }

    return records;
  }

  async function handleSaveDropJump(
    form: DropJumpFormState,
    summary: DropJumpSummary,
  ) {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar el Drop Jump",
        message: "Faltan equipo, jugador o contexto de ejecucion.",
      });
      return;
    }

    const formSnapshot: DropJumpFormState = {
      ...form,
      bipodalAttempts: form.bipodalAttempts.map((attempt) => ({
        ...attempt,
      })),
      rightAttempts: form.rightAttempts.map((attempt) => ({
        ...attempt,
      })),
      leftAttempts: form.leftAttempts.map((attempt) => ({
        ...attempt,
      })),
    };
    const playerSnapshot = selectedCatalogPlayer;
    const teamIdSnapshot = selectedTeamId;
    const dropJumpSummarySnapshot = summary;

    try {
      setSavingDropJump(true);
      setCatalogMessage(null);

      const bodyMassKg = parsePositiveDropJumpNumber(formSnapshot.bodyMassKg);
      const boxHeightCm = parsePositiveDropJumpNumber(formSnapshot.boxHeightCm);
      const saved = await createTestSessionWithResults({
        team_id: teamIdSnapshot,
        session_date: formSnapshot.performedAt,
        session_name: `${DROP_JUMP_TEST_NAME} - ${
          playerSnapshot.name
        } - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: `${DROP_JUMP_TEST_NAME} ejecutado con ${DROP_JUMP_DEVICE}. Modalidad: ${formSnapshot.modality}. Cajon: ${boxHeightCm} cm.`,
        tests: [
          {
            id: DROP_JUMP_TEST_ID,
            name: DROP_JUMP_TEST_NAME,
            category: DROP_JUMP_TEST_CATEGORY,
            device: DROP_JUMP_DEVICE,
            modality: formSnapshot.modality,
            bodyMassKg,
            boxHeightCm,
            summary: dropJumpSummarySnapshot,
          },
        ],
        records: buildDropJumpRecords(
          playerSnapshot,
          formSnapshot,
          dropJumpSummarySnapshot,
        ),
        skipScores: true,
      });

      await loadSessionsForTeam(teamIdSnapshot, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCatalogMessage({
        variant: "success",
        title: "Drop Jump guardado",
        message:
          "Se han guardado los intentos validos, RSI y mejores resultados del Drop Jump. El historico del equipo se ha recargado automaticamente.",
      });
      resetDropJumpState();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar el Drop Jump.";

      setCatalogMessage({
        variant: "error",
        title: "No se ha podido guardar el Drop Jump",
        message,
      });
    } finally {
      setSavingDropJump(false);
    }
  }

  function buildThirtyFifteenIftRecords(
    player: TestPlayerRow,
    summary: ThirtyFifteenIftSummary,
  ): TestRecordInput[] {
    const createRecord = (variable: string, value: number): TestRecordInput => ({
      player_id: player.id,
      player_name: player.name,
      normalized_name: player.normalized_name,
      position: player.position,
      test_block: THIRTY_FIFTEEN_IFT_TEST_NAME,
      variable,
      value,
      unit: THIRTY_FIFTEEN_IFT_UNIT_SPEED,
    });

    const records: TestRecordInput[] = [];

    if (summary.lastCompletedLevel !== null) {
      records.push(
        createRecord(
          THIRTY_FIFTEEN_IFT_VARIABLES.LAST_COMPLETED_LEVEL,
          summary.lastCompletedLevel,
        ),
      );
    }

    if (summary.withdrawalLevel !== null) {
      records.push(
        createRecord(
          THIRTY_FIFTEEN_IFT_VARIABLES.WITHDRAWAL_LEVEL,
          summary.withdrawalLevel,
        ),
      );
    }

    if (summary.vift !== null) {
      records.push(
        createRecord(THIRTY_FIFTEEN_IFT_VARIABLES.VIFT, summary.vift),
      );
    }

    return records;
  }

  async function handleSaveThirtyFifteenIft(
    form: ThirtyFifteenIftFormState,
    summary: ThirtyFifteenIftSummary,
  ) {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar el 30-15 IFT",
        message: "Faltan equipo, jugador o contexto de ejecución.",
      });
      return;
    }

    const formSnapshot = {
      ...form,
      observations: form.observations.trim(),
    };
    const playerSnapshot = selectedCatalogPlayer;
    const teamIdSnapshot = selectedTeamId;
    const summarySnapshot = summary;

    try {
      setSavingThirtyFifteenIft(true);
      setCatalogMessage(null);

      const saved = await createTestSessionWithResults({
        team_id: teamIdSnapshot,
        session_date: formSnapshot.performedAt,
        session_name: `${THIRTY_FIFTEEN_IFT_TEST_NAME} - ${
          playerSnapshot.name
        } - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: summarySnapshot.observations || null,
        tests: [
          {
            id: THIRTY_FIFTEEN_IFT_TEST_ID,
            name: THIRTY_FIFTEEN_IFT_TEST_NAME,
            category: THIRTY_FIFTEEN_IFT_TEST_CATEGORY,
            summary: summarySnapshot,
          },
        ],
        records: buildThirtyFifteenIftRecords(playerSnapshot, summarySnapshot),
        skipScores: true,
      });

      await loadSessionsForTeam(teamIdSnapshot, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCatalogMessage({
        variant: "success",
        title: "30-15 IFT guardado",
        message:
          "Se han guardado el último nivel completado, el abandono si se indicó y la VIFT. El histórico del equipo se ha recargado automáticamente.",
      });
      resetThirtyFifteenIftState();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar el 30-15 IFT.";

      setCatalogMessage({
        variant: "error",
        title: "No se ha podido guardar el 30-15 IFT",
        message,
      });
    } finally {
      setSavingThirtyFifteenIft(false);
    }
  }

  function buildRsa6x30Records(
    player: TestPlayerRow,
    summary: Rsa6x30Summary,
  ): TestRecordInput[] {
    const createRecord = (variable: string, value: number, unit: string) => ({
      player_id: player.id,
      player_name: player.name,
      normalized_name: player.normalized_name,
      position: player.position,
      test_block: RSA_6X30_TEST_NAME,
      variable,
      value,
      unit,
    });
    const records = summary.sprintTimes.flatMap((time, index) => {
      const variable = RSA_6X30_SPRINT_VARIABLES[index];

      return variable
        ? [createRecord(variable, time, RSA_6X30_UNIT_TIME)]
        : [];
    });

    if (
      summary.bestTime === null ||
      summary.worstTime === null ||
      summary.meanTime === null ||
      summary.totalTime === null ||
      summary.decrement === null ||
      summary.absoluteDifference === null
    ) {
      return records;
    }

    records.push(
      createRecord(
        RSA_6X30_VARIABLES.BEST_TIME,
        summary.bestTime,
        RSA_6X30_UNIT_TIME,
      ),
      createRecord(
        RSA_6X30_VARIABLES.WORST_TIME,
        summary.worstTime,
        RSA_6X30_UNIT_TIME,
      ),
      createRecord(
        RSA_6X30_VARIABLES.MEAN_TIME,
        summary.meanTime,
        RSA_6X30_UNIT_TIME,
      ),
      createRecord(
        RSA_6X30_VARIABLES.TOTAL_TIME,
        summary.totalTime,
        RSA_6X30_UNIT_TIME,
      ),
      createRecord(
        RSA_6X30_VARIABLES.DECREMENT,
        summary.decrement,
        RSA_6X30_UNIT_PERCENTAGE,
      ),
      createRecord(
        RSA_6X30_VARIABLES.ABSOLUTE_DIFFERENCE,
        summary.absoluteDifference,
        RSA_6X30_UNIT_TIME,
      ),
    );

    return records;
  }

  async function handleSaveRsa6x30(
    form: Rsa6x30FormState,
    summary: Rsa6x30Summary,
  ) {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar el RSA 6 X 30M",
        message: "Faltan equipo, jugador o contexto de ejecución.",
      });
      return;
    }

    const formSnapshot = {
      ...form,
      sprintTimes: [...form.sprintTimes] as Rsa6x30FormState["sprintTimes"],
      observations: form.observations.trim(),
    };
    const playerSnapshot = selectedCatalogPlayer;
    const teamIdSnapshot = selectedTeamId;
    const summarySnapshot = summary;

    try {
      setSavingRsa6x30(true);
      setCatalogMessage(null);

      const saved = await createTestSessionWithResults({
        team_id: teamIdSnapshot,
        session_date: formSnapshot.performedAt,
        session_name: `${RSA_6X30_TEST_NAME} - ${playerSnapshot.name} - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: summarySnapshot.observations || null,
        tests: [
          {
            id: RSA_6X30_TEST_ID,
            name: RSA_6X30_TEST_NAME,
            category: RSA_6X30_TEST_CATEGORY,
            summary: summarySnapshot,
          },
        ],
        records: buildRsa6x30Records(playerSnapshot, summarySnapshot),
        skipScores: true,
      });

      await loadSessionsForTeam(teamIdSnapshot, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCatalogMessage({
        variant: "success",
        title: "RSA 6 X 30M guardado",
        message:
          "Se han guardado los seis sprints y los indicadores calculados. El histórico del equipo se ha recargado automáticamente.",
      });
      resetRsa6x30State();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar el RSA 6 X 30M.";

      setCatalogMessage({
        variant: "error",
        title: "No se ha podido guardar el RSA 6 X 30M",
        message,
      });
    } finally {
      setSavingRsa6x30(false);
    }
  }

  function buildSprint30Records(
    player: TestPlayerRow,
    summary: Sprint30Summary,
  ): TestRecordInput[] {
    const createRecord = (variable: string, value: number, unit: string) => ({
      player_id: player.id,
      player_name: player.name,
      normalized_name: player.normalized_name,
      position: player.position,
      test_block: SPRINT_30M_TEST_NAME,
      variable,
      value,
      unit,
    });
    const records = summary.validAttempts.flatMap((attempt) => [
      createRecord(
        getSprint30Attempt5mVariable(attempt.attemptNumber),
        attempt.time5m,
        SPRINT_30M_UNIT_TIME,
      ),
      createRecord(
        getSprint30Attempt30mVariable(attempt.attemptNumber),
        attempt.time30m,
        SPRINT_30M_UNIT_TIME,
      ),
    ]);

    if (
      !summary.best5m ||
      !summary.best30m ||
      summary.mean5m === null ||
      summary.mean30m === null ||
      summary.time5mAssociatedBest30m === null ||
      summary.time30mAssociatedBest5m === null
    ) {
      return records;
    }

    records.push(
      createRecord(
        SPRINT_30M_VARIABLES.BEST_TIME_5M,
        summary.best5m.time5m,
        SPRINT_30M_UNIT_TIME,
      ),
      createRecord(
        SPRINT_30M_VARIABLES.BEST_TIME_30M,
        summary.best30m.time30m,
        SPRINT_30M_UNIT_TIME,
      ),
      createRecord(
        SPRINT_30M_VARIABLES.BEST_ATTEMPT_5M,
        summary.best5m.attemptNumber,
        SPRINT_30M_UNIT_ATTEMPT,
      ),
      createRecord(
        SPRINT_30M_VARIABLES.BEST_ATTEMPT_30M,
        summary.best30m.attemptNumber,
        SPRINT_30M_UNIT_ATTEMPT,
      ),
      createRecord(
        SPRINT_30M_VARIABLES.TIME_5M_ASSOCIATED_BEST_30M,
        summary.time5mAssociatedBest30m,
        SPRINT_30M_UNIT_TIME,
      ),
      createRecord(
        SPRINT_30M_VARIABLES.TIME_30M_ASSOCIATED_BEST_5M,
        summary.time30mAssociatedBest5m,
        SPRINT_30M_UNIT_TIME,
      ),
      createRecord(
        SPRINT_30M_VARIABLES.MEAN_TIME_5M,
        summary.mean5m,
        SPRINT_30M_UNIT_TIME,
      ),
      createRecord(
        SPRINT_30M_VARIABLES.MEAN_TIME_30M,
        summary.mean30m,
        SPRINT_30M_UNIT_TIME,
      ),
    );

    return records;
  }

  async function handleSaveSprint30(
    form: Sprint30FormState,
    summary: Sprint30Summary,
  ) {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar el Sprint 30M",
        message: "Faltan equipo, jugador o contexto de ejecución.",
      });
      return;
    }

    const formSnapshot = {
      ...form,
      attempts: form.attempts.map((attempt) => ({ ...attempt })),
      observations: form.observations.trim(),
    };
    const playerSnapshot = selectedCatalogPlayer;
    const teamIdSnapshot = selectedTeamId;
    const summarySnapshot = summary;

    try {
      setSavingSprint30(true);
      setCatalogMessage(null);

      const saved = await createTestSessionWithResults({
        team_id: teamIdSnapshot,
        session_date: formSnapshot.performedAt,
        session_name: `${SPRINT_30M_TEST_NAME} - ${playerSnapshot.name} - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: summarySnapshot.observations || null,
        tests: [
          {
            id: SPRINT_30M_TEST_ID,
            name: SPRINT_30M_TEST_NAME,
            category: SPRINT_30M_TEST_CATEGORY,
            summary: summarySnapshot,
          },
        ],
        records: buildSprint30Records(playerSnapshot, summarySnapshot),
        skipScores: true,
      });

      await loadSessionsForTeam(teamIdSnapshot, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCatalogMessage({
        variant: "success",
        title: "Sprint 30M guardado",
        message:
          "Se han guardado los intentos de 5 m y 30 m, junto con los mejores valores y promedios. El histórico del equipo se ha recargado automáticamente.",
      });
      resetSprint30State();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar el Sprint 30M.";

      setCatalogMessage({
        variant: "error",
        title: "No se ha podido guardar el Sprint 30M",
        message,
      });
    } finally {
      setSavingSprint30(false);
    }
  }

  function buildAcceleration5mRecords(
    player: TestPlayerRow,
    summary: Acceleration5mSummary,
  ): TestRecordInput[] {
    const createRecord = (variable: string, value: number, unit: string) => ({
      player_id: player.id,
      player_name: player.name,
      normalized_name: player.normalized_name,
      position: player.position,
      test_block: ACCELERATION_5M_TEST_NAME,
      variable,
      value,
      unit,
    });
    const records = summary.validAttempts.flatMap((attempt) => {
      const variable =
        ACCELERATION_5M_ATTEMPT_VARIABLES[attempt.attemptNumber - 1];

      return variable
        ? [createRecord(variable, attempt.time, ACCELERATION_5M_UNIT_TIME)]
        : [];
    });

    if (
      !summary.bestAttempt ||
      !summary.worstAttempt ||
      summary.meanTime === null ||
      summary.absoluteDifference === null ||
      summary.bestWorstVariation === null
    ) {
      return records;
    }

    records.push(
      createRecord(
        ACCELERATION_5M_VARIABLES.BEST_TIME,
        summary.bestAttempt.time,
        ACCELERATION_5M_UNIT_TIME,
      ),
      createRecord(
        ACCELERATION_5M_VARIABLES.BEST_ATTEMPT,
        summary.bestAttempt.attemptNumber,
        ACCELERATION_5M_UNIT_ATTEMPT,
      ),
      createRecord(
        ACCELERATION_5M_VARIABLES.WORST_TIME,
        summary.worstAttempt.time,
        ACCELERATION_5M_UNIT_TIME,
      ),
      createRecord(
        ACCELERATION_5M_VARIABLES.MEAN_TIME,
        summary.meanTime,
        ACCELERATION_5M_UNIT_TIME,
      ),
      createRecord(
        ACCELERATION_5M_VARIABLES.ABSOLUTE_DIFFERENCE,
        summary.absoluteDifference,
        ACCELERATION_5M_UNIT_TIME,
      ),
      createRecord(
        ACCELERATION_5M_VARIABLES.BEST_WORST_VARIATION,
        summary.bestWorstVariation,
        ACCELERATION_5M_UNIT_PERCENTAGE,
      ),
    );

    return records;
  }

  async function handleSaveAcceleration5m(
    form: Acceleration5mFormState,
    summary: Acceleration5mSummary,
  ) {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar la Aceleración 5 m",
        message: "Faltan equipo, jugador o contexto de ejecución.",
      });
      return;
    }

    const formSnapshot = {
      ...form,
      attempts: form.attempts.map((attempt) => ({ ...attempt })),
      observations: form.observations.trim(),
    };
    const playerSnapshot = selectedCatalogPlayer;
    const teamIdSnapshot = selectedTeamId;
    const summarySnapshot = summary;

    try {
      setSavingAcceleration5m(true);
      setCatalogMessage(null);

      const saved = await createTestSessionWithResults({
        team_id: teamIdSnapshot,
        session_date: formSnapshot.performedAt,
        session_name: `${ACCELERATION_5M_TEST_NAME} - ${playerSnapshot.name} - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: summarySnapshot.observations || null,
        tests: [
          {
            id: ACCELERATION_5M_TEST_ID,
            name: ACCELERATION_5M_TEST_NAME,
            category: ACCELERATION_5M_TEST_CATEGORY,
            summary: summarySnapshot,
          },
        ],
        records: buildAcceleration5mRecords(playerSnapshot, summarySnapshot),
        skipScores: true,
      });

      await loadSessionsForTeam(teamIdSnapshot, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCatalogMessage({
        variant: "success",
        title: "Aceleración 5 m guardada",
        message:
          "Se han guardado los intentos y los indicadores calculados. El histórico del equipo se ha recargado automáticamente.",
      });
      resetAcceleration5mState();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar la Aceleración 5 m.";

      setCatalogMessage({
        variant: "error",
        title: "No se ha podido guardar la Aceleración 5 m",
        message,
      });
    } finally {
      setSavingAcceleration5m(false);
    }
  }

  function buildIllinoisRecords(
    player: TestPlayerRow,
    summary: IllinoisSummary,
  ): TestRecordInput[] {
    const createRecord = (variable: string, value: number, unit: string) => ({
      player_id: player.id,
      player_name: player.name,
      normalized_name: player.normalized_name,
      position: player.position,
      test_block: ILLINOIS_TEST_NAME,
      variable,
      value,
      unit,
    });
    const records = summary.validAttempts.flatMap((attempt) => {
      const variable = ILLINOIS_ATTEMPT_VARIABLES[attempt.attemptNumber - 1];

      return variable
        ? [createRecord(variable, attempt.time, ILLINOIS_UNIT_TIME)]
        : [];
    });

    if (
      !summary.bestAttempt ||
      !summary.worstAttempt ||
      summary.meanTime === null ||
      summary.absoluteDifference === null ||
      summary.bestWorstVariation === null
    ) {
      return records;
    }

    records.push(
      createRecord(
        ILLINOIS_VARIABLES.BEST_TIME,
        summary.bestAttempt.time,
        ILLINOIS_UNIT_TIME,
      ),
      createRecord(
        ILLINOIS_VARIABLES.BEST_ATTEMPT,
        summary.bestAttempt.attemptNumber,
        ILLINOIS_UNIT_ATTEMPT,
      ),
      createRecord(
        ILLINOIS_VARIABLES.WORST_TIME,
        summary.worstAttempt.time,
        ILLINOIS_UNIT_TIME,
      ),
      createRecord(
        ILLINOIS_VARIABLES.MEAN_TIME,
        summary.meanTime,
        ILLINOIS_UNIT_TIME,
      ),
      createRecord(
        ILLINOIS_VARIABLES.ABSOLUTE_DIFFERENCE,
        summary.absoluteDifference,
        ILLINOIS_UNIT_TIME,
      ),
      createRecord(
        ILLINOIS_VARIABLES.BEST_WORST_VARIATION,
        summary.bestWorstVariation,
        ILLINOIS_UNIT_PERCENTAGE,
      ),
    );

    return records;
  }

  async function handleSaveIllinois(
    form: IllinoisFormState,
    summary: IllinoisSummary,
  ) {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar Illinois",
        message: "Faltan equipo, jugador o contexto de ejecución.",
      });
      return;
    }

    const formSnapshot = {
      ...form,
      attempts: form.attempts.map((attempt) => ({ ...attempt })),
      observations: form.observations.trim(),
    };
    const playerSnapshot = selectedCatalogPlayer;
    const teamIdSnapshot = selectedTeamId;
    const summarySnapshot = summary;

    try {
      setSavingIllinois(true);
      setCatalogMessage(null);

      const saved = await createTestSessionWithResults({
        team_id: teamIdSnapshot,
        session_date: formSnapshot.performedAt,
        session_name: `${ILLINOIS_TEST_NAME} - ${playerSnapshot.name} - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: summarySnapshot.observations || null,
        tests: [
          {
            id: ILLINOIS_TEST_ID,
            name: ILLINOIS_TEST_NAME,
            category: ILLINOIS_TEST_CATEGORY,
            summary: summarySnapshot,
          },
        ],
        records: buildIllinoisRecords(playerSnapshot, summarySnapshot),
        skipScores: true,
      });

      await loadSessionsForTeam(teamIdSnapshot, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCatalogMessage({
        variant: "success",
        title: "Illinois guardado",
        message:
          "Se han guardado los intentos y los indicadores calculados. El histórico del equipo se ha recargado automáticamente.",
      });
      resetIllinoisState();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error desconocido al guardar Illinois.";

      setCatalogMessage({
        variant: "error",
        title: "No se ha podido guardar Illinois",
        message,
      });
    } finally {
      setSavingIllinois(false);
    }
  }

  function buildSquatVmpRecords(
    player: TestPlayerRow,
    summary: SquatVmpSummary,
  ): TestRecordInput[] {
    return createSquatVmpResults(summary).map((result) => ({
      player_id: player.id,
      player_name: player.name,
      normalized_name: player.normalized_name,
      position: player.position,
      test_block: SQUAT_VMP_TEST_NAME,
      variable: result.variable,
      value: result.value,
      unit: result.unit,
      source: SQUAT_VMP_DEVICE,
    }));
  }

  async function handleSaveSquatVmp(
    form: SquatVmpFormState,
    summary: SquatVmpSummary,
  ) {
    if (savingJumpTest) return;

    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) {
      setCatalogMessage({
        variant: "error",
        title: "No se puede guardar VMP Sentadilla",
        message: "Faltan equipo, jugador o contexto de ejecución.",
      });
      return;
    }

    const formSnapshot = { ...form, observations: form.observations.trim() };
    const playerSnapshot = selectedCatalogPlayer;
    const teamIdSnapshot = selectedTeamId;
    const summarySnapshot = summary;

    try {
      setSavingSquatVmp(true);
      setCatalogMessage(null);

      const saved = await createTestSessionWithResults({
        team_id: teamIdSnapshot,
        session_date: formSnapshot.performedAt,
        session_name: `${SQUAT_VMP_TEST_NAME} - ${playerSnapshot.name} - ${new Date().toLocaleTimeString("es-ES")}`,
        context: "Semi-profesional",
        notes: summarySnapshot.observations || null,
        tests: [{ id: SQUAT_VMP_TEST_ID, name: SQUAT_VMP_TEST_NAME, category: SQUAT_VMP_TEST_CATEGORY, device: SQUAT_VMP_DEVICE, summary: summarySnapshot }],
        records: buildSquatVmpRecords(playerSnapshot, summarySnapshot),
        skipScores: true,
      });

      await loadSessionsForTeam(teamIdSnapshot, saved.session.id);
      setActiveView("history");
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setExecutionStage("CATALOG");
      setExecutionDraft(null);
      setCatalogMessage({ variant: "success", title: "VMP Sentadilla guardada", message: "Se han guardado la carga, la VMP de la repetición y la VMP máxima. El histórico del equipo se ha recargado automáticamente." });
      resetSquatVmpState();
    } catch (err) {
      setCatalogMessage({ variant: "error", title: "No se ha podido guardar VMP Sentadilla", message: err instanceof Error ? err.message : "Error desconocido al guardar VMP Sentadilla." });
    } finally {
      setSavingSquatVmp(false);
    }
  }

  function buildHipThrustVmpRecords(player: TestPlayerRow, summary: HipThrustVmpSummary): TestRecordInput[] {
    return createHipThrustVmpResults(summary).map((result) => ({ player_id: player.id, player_name: player.name, normalized_name: player.normalized_name, position: player.position, test_block: HIP_THRUST_VMP_TEST_NAME, variable: result.variable, value: result.value, unit: result.unit, source: HIP_THRUST_VMP_DEVICE }));
  }

  async function handleSaveHipThrustVmp(form: HipThrustVmpFormState, summary: HipThrustVmpSummary) {
    if (savingJumpTest) return;
    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) { setCatalogMessage({ variant: "error", title: "No se puede guardar VMP Hip Thrust", message: "Faltan equipo, jugador o contexto de ejecución." }); return; }
    const formSnapshot = { ...form, observations: form.observations.trim() };
    const playerSnapshot = selectedCatalogPlayer; const teamIdSnapshot = selectedTeamId; const summarySnapshot = summary;
    try {
      setSavingHipThrustVmp(true); setCatalogMessage(null);
      const saved = await createTestSessionWithResults({ team_id: teamIdSnapshot, session_date: formSnapshot.performedAt, session_name: `${HIP_THRUST_VMP_TEST_NAME} - ${playerSnapshot.name} - ${new Date().toLocaleTimeString("es-ES")}`, context: "Semi-profesional", notes: summarySnapshot.observations || null, tests: [{ id: HIP_THRUST_VMP_TEST_ID, name: HIP_THRUST_VMP_TEST_NAME, category: HIP_THRUST_VMP_TEST_CATEGORY, device: HIP_THRUST_VMP_DEVICE, summary: summarySnapshot }], records: buildHipThrustVmpRecords(playerSnapshot, summarySnapshot), skipScores: true });
      await loadSessionsForTeam(teamIdSnapshot, saved.session.id); setActiveView("history"); setSelectedCatalogTest(null); setSelectedCatalogPlayerId(""); setExecutionStage("CATALOG"); setExecutionDraft(null);
      setCatalogMessage({ variant: "success", title: "VMP Hip Thrust guardada", message: "Se han guardado la carga, la VMP de la repetición y la VMP máxima. El histórico del equipo se ha recargado automáticamente." }); resetHipThrustVmpState();
    } catch (err) { setCatalogMessage({ variant: "error", title: "No se ha podido guardar VMP Hip Thrust", message: err instanceof Error ? err.message : "Error desconocido al guardar VMP Hip Thrust." }); } finally { setSavingHipThrustVmp(false); }
  }

  async function handleSaveLoadVelocityProfile(form: LoadVelocityProfileFormState, summary: LoadVelocityProfileSummary) {
    if (savingJumpTest) return;
    if (!executionDraft || !selectedCatalogPlayer || !selectedTeamId) { setCatalogMessage({ variant: "error", title: "No se puede guardar el perfil", message: "Faltan equipo, jugador o contexto de ejecución." }); return; }
    const records = createLoadVelocityProfileResults(summary).map((result) => ({ player_id: selectedCatalogPlayer.id, player_name: selectedCatalogPlayer.name, normalized_name: selectedCatalogPlayer.normalized_name, position: selectedCatalogPlayer.position, test_block: LOAD_VELOCITY_PROFILE_TEST_NAME, variable: result.variable, value: result.value, unit: result.unit, source: LOAD_VELOCITY_PROFILE_DEVICE }));
    if (records.length === 0) { setCatalogMessage({ variant: "error", title: "Perfil no válido", message: summary.mathematicalError ?? "No se han podido generar resultados válidos." }); return; }
    const teamId = selectedTeamId; const player = selectedCatalogPlayer;
    try { setSavingLoadVelocityProfile(true); setCatalogMessage(null); const saved = await createTestSessionWithResults({ team_id: teamId, session_date: form.performedAt, session_name: `${LOAD_VELOCITY_PROFILE_TEST_NAME} - ${player.name} - ${new Date().toLocaleTimeString("es-ES")}`, context: "Semi-profesional", notes: form.observations.trim() || null, tests: [{ id: LOAD_VELOCITY_PROFILE_TEST_ID, name: LOAD_VELOCITY_PROFILE_TEST_NAME, category: LOAD_VELOCITY_PROFILE_TEST_CATEGORY, device: LOAD_VELOCITY_PROFILE_DEVICE, exercise: form.exercise, targetSpeed: summary.targetSpeed, loadCount: summary.rows.length, summary }], records, skipScores: true }); await loadSessionsForTeam(teamId, saved.session.id); setActiveView("history"); setSelectedCatalogTest(null); setSelectedCatalogPlayerId(""); setExecutionStage("CATALOG"); setExecutionDraft(null); setCatalogMessage({ variant: "success", title: "Perfil Carga–Velocidad guardado", message: "Se han guardado las cargas, repeticiones y resultados de regresión. El histórico se ha recargado." }); resetLoadVelocityProfileState(); } catch (err) { setCatalogMessage({ variant: "error", title: "No se ha podido guardar el perfil", message: err instanceof Error ? err.message : "Error desconocido." }); } finally { setSavingLoadVelocityProfile(false); }
  }

  useEffect(() => {
    async function loadSessionData() {
      if (!selectedSessionId || !selectedTeamId) {
        setResults([]);
        setScores([]);
        setSelectedCapacity("all");
        return;
      }

      try {
        setLoadingData(true);
        setError(null);

        const [resultsData, scoresData] = await Promise.all([
          getTestResultsBySessionId(selectedSessionId, selectedTeamId),
          getTestScoresBySessionId(selectedSessionId, selectedTeamId),
        ]);

        if (ignore) {
          return;
        }

        setResults(resultsData);
        setScores(scoresData);
        setSelectedCapacity("all");
      } catch (err) {
        if (ignore) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar los datos de la sesión de tests.";

        setError(message);
      } finally {
        if (!ignore) {
          setLoadingData(false);
        }
      }
    }

    let ignore = false;
    loadSessionData();

    return () => {
      ignore = true;
    };
  }, [selectedSessionId, selectedTeamId]);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  const selectedTeam = useMemo(() => {
    return teams.find((team) => team.id === selectedTeamId) ?? null;
  }, [teams, selectedTeamId]);

  const selectedCatalogPlayer =
    teamPlayers.find((player) => player.id === selectedCatalogPlayerId) ?? null;
  const isCurrentExecutionCmj = isCmjCatalogTest(selectedCatalogTest);
  const isCurrentExecutionSj = isSjCatalogTest(selectedCatalogTest);
  const isCurrentExecutionAbalakov =
    isAbalakovCatalogTest(selectedCatalogTest);
  const isCurrentExecutionDropJump =
    isDropJumpCatalogTest(selectedCatalogTest);
  const isCurrentExecutionThirtyFifteenIft =
    isThirtyFifteenIftCatalogTest(selectedCatalogTest);
  const isCurrentExecutionRsa6x30 = isRsa6x30CatalogTest(selectedCatalogTest);
  const isCurrentExecutionSprint30 = isSprint30CatalogTest(selectedCatalogTest);
  const isCurrentExecutionAcceleration5m =
    isAcceleration5mCatalogTest(selectedCatalogTest);
  const isCurrentExecutionIllinois = isIllinoisCatalogTest(selectedCatalogTest);
  const isCurrentExecutionSquatVmp = isSquatVmpCatalogTest(selectedCatalogTest);
  const isCurrentExecutionHipThrustVmp = isHipThrustVmpCatalogTest(selectedCatalogTest);
  const isCurrentExecutionLoadVelocityProfile = isLoadVelocityProfileCatalogTest(selectedCatalogTest);
  const isCurrentExecutionJump =
    isCurrentExecutionCmj || isCurrentExecutionSj || isCurrentExecutionAbalakov;
  const cmjSummary = calculateCmjSummary({
    bodyMassKg: cmjForm.bodyMassKg,
    modality: cmjForm.modality,
    bipodalAttempts: cmjForm.bipodalAttempts,
    rightAttempts: cmjForm.rightAttempts,
    leftAttempts: cmjForm.leftAttempts,
  });
  const sjSummary = calculateSjSummary({
    bodyMassKg: sjForm.bodyMassKg,
    modality: sjForm.modality as SjModality,
    bipodalAttempts: sjForm.bipodalAttempts,
    rightAttempts: sjForm.rightAttempts,
    leftAttempts: sjForm.leftAttempts,
  });
  const abalakovSummary = calculateAbalakovSummary({
    bodyMassKg: abalakovForm.bodyMassKg,
    modality: abalakovForm.modality as AbalakovModality,
    bipodalAttempts: abalakovForm.bipodalAttempts,
    rightAttempts: abalakovForm.rightAttempts,
    leftAttempts: abalakovForm.leftAttempts,
  });
  const activeJumpForm = isCurrentExecutionAbalakov
    ? abalakovForm
    : isCurrentExecutionSj
      ? sjForm
      : cmjForm;
  const activeJumpSummary = isCurrentExecutionAbalakov
    ? abalakovSummary
    : isCurrentExecutionSj
      ? sjSummary
      : cmjSummary;
  const activeJumpErrors = isCurrentExecutionAbalakov
    ? abalakovErrors
    : isCurrentExecutionSj
      ? sjErrors
      : cmjErrors;
  const activeJumpDevice = isCurrentExecutionAbalakov
    ? ABALAKOV_DEVICE
    : isCurrentExecutionSj
      ? SJ_DEVICE
      : CMJ_DEVICE;
  const activeJumpMaxAttempts = isCurrentExecutionAbalakov
    ? ABALAKOV_MAX_ATTEMPTS
    : isCurrentExecutionSj
      ? SJ_MAX_ATTEMPTS
      : CMJ_MAX_ATTEMPTS;
  const activeJumpTitle = isCurrentExecutionAbalakov
    ? ABALAKOV_TEST_NAME
    : isCurrentExecutionSj
      ? SJ_TEST_NAME
      : CMJ_TEST_NAME;

  function setActiveJumpForm(updater: (currentForm: JumpFormState) => JumpFormState) {
    if (isCurrentExecutionAbalakov) {
      setAbalakovForm(updater);
      return;
    }

    if (isCurrentExecutionSj) {
      setSjForm(updater);
      return;
    }

    setCmjForm(updater);
  }

  function activeJumpIncludesBipodal(modality: JumpModality) {
    if (isCurrentExecutionAbalakov) {
      return modalityIncludesAbalakovBipodal(modality as AbalakovModality);
    }

    return isCurrentExecutionSj
      ? modalityIncludesSjBipodal(modality as SjModality)
      : modalityIncludesBipodal(modality as CmjModality);
  }

  function activeJumpIncludesUnipodal(modality: JumpModality) {
    if (isCurrentExecutionAbalakov) {
      return modalityIncludesAbalakovUnipodal(modality as AbalakovModality);
    }

    return isCurrentExecutionSj
      ? modalityIncludesSjUnipodal(modality as SjModality)
      : modalityIncludesUnipodal(modality as CmjModality);
  }

  function handleActiveJumpAttemptChange(
    side: JumpAttemptSide,
    index: number,
    value: string,
  ) {
    if (isCurrentExecutionAbalakov) {
      handleAbalakovAttemptChange(side as AbalakovAttemptSide, index, value);
      return;
    }

    if (isCurrentExecutionSj) {
      handleSjAttemptChange(side as SjAttemptSide, index, value);
      return;
    }

    handleCmjAttemptChange(side as CmjAttemptSide, index, value);
  }

  function handleAddActiveJumpAttempt(side: JumpAttemptSide) {
    if (isCurrentExecutionAbalakov) {
      handleAddAbalakovAttempt(side as AbalakovAttemptSide);
      return;
    }

    if (isCurrentExecutionSj) {
      handleAddSjAttempt(side as SjAttemptSide);
      return;
    }

    handleAddCmjAttempt(side as CmjAttemptSide);
  }

  function handleRemoveActiveJumpAttempt(side: JumpAttemptSide, index: number) {
    if (isCurrentExecutionAbalakov) {
      handleRemoveAbalakovAttempt(side as AbalakovAttemptSide, index);
      return;
    }

    if (isCurrentExecutionSj) {
      handleRemoveSjAttempt(side as SjAttemptSide, index);
      return;
    }

    handleRemoveCmjAttempt(side as CmjAttemptSide, index);
  }

  function handleReviewActiveJump() {
    if (isCurrentExecutionAbalakov) {
      handleReviewAbalakov();
      return;
    }

    if (isCurrentExecutionSj) {
      handleReviewSj();
      return;
    }

    handleReviewCmj();
  }

  async function handleSaveActiveJump() {
    if (isCurrentExecutionAbalakov) {
      await handleSaveAbalakov();
      return;
    }

    if (isCurrentExecutionSj) {
      await handleSaveSj();
      return;
    }

    await handleSaveCmj();
  }

  const capacityOptions = useMemo(() => {
    const capacities = new Set<string>();

    scores.forEach((score) => {
      if (score.capacity) capacities.add(score.capacity);
    });

    return Array.from(capacities).sort((a, b) => a.localeCompare(b));
  }, [scores]);

  const filteredScores = useMemo(() => {
    if (selectedCapacity === "all") return scores;

    return scores.filter((score) => score.capacity === selectedCapacity);
  }, [scores, selectedCapacity]);

  const filteredResults = useMemo(() => {
    if (selectedCapacity === "all") return results;

    return results.filter((result) => result.test_block === selectedCapacity);
  }, [results, selectedCapacity]);

  const summary = useMemo(() => {
    const players = getUniquePlayers(results.length > 0 ? results : scores);

    const validScores = scores.filter(
      (score) =>
        score.final_score !== null &&
        score.final_score !== undefined &&
        Number.isFinite(Number(score.final_score)),
    );

    const averageScore =
      validScores.length > 0
        ? validScores.reduce(
            (sum, score) => sum + Number(score.final_score),
            0,
          ) / validScores.length
        : null;

    const capacities = new Set(
      scores.map((score) => score.capacity).filter(Boolean),
    );

    const variables = new Set(
      results.map((result) => result.variable).filter(Boolean),
    );

    return {
      players: players.size,
      scores: scores.length,
      results: results.length,
      capacities: capacities.size,
      variables: variables.size,
      averageScore,
    };
  }, [results, scores]);

  const rankingRows = useMemo(() => {
    const players = new Map<
      string,
      {
        playerName: string;
        position: string | null;
        totalScore: number;
        count: number;
        averageScore: number;
      }
    >();

    scores.forEach((score) => {
      if (score.final_score === null || score.final_score === undefined) return;

      const current = players.get(score.normalized_name) ?? {
        playerName: score.player_name,
        position: score.position,
        totalScore: 0,
        count: 0,
        averageScore: 0,
      };

      current.totalScore += Number(score.final_score);
      current.count += 1;
      current.averageScore = current.totalScore / current.count;

      players.set(score.normalized_name, current);
    });

    return Array.from(players.values()).sort(
      (a, b) => b.averageScore - a.averageScore,
    );
  }, [scores]);

  const quickTestReadingCards = useMemo<QuickReadingCard[]>(() => {
    const capacityMap = new Map<string, { total: number; count: number }>();

    scores.forEach((score) => {
      const value = Number(score.final_score);

      if (
        score.final_score === null ||
        score.final_score === undefined ||
        !Number.isFinite(value) ||
        !score.capacity
      ) {
        return;
      }

      const current = capacityMap.get(score.capacity) ?? {
        total: 0,
        count: 0,
      };

      current.total += value;
      current.count += 1;
      capacityMap.set(score.capacity, current);
    });

    const capacitySummaries = Array.from(capacityMap.entries())
      .map(([capacity, values]) => ({
        capacity,
        average: values.total / values.count,
      }))
      .sort((a, b) => b.average - a.average);
    const bestCapacity = capacitySummaries[0] ?? null;
    const lowestCapacity =
      capacitySummaries[capacitySummaries.length - 1] ?? null;
    const invalidScores = scores.filter((score) => {
      return (
        score.final_score === null ||
        score.final_score === undefined ||
        !Number.isFinite(Number(score.final_score))
      );
    }).length;
    const incompleteScores = scores.filter((score) => {
      const used = Number(score.used_variables);
      const expected = Number(score.expected_variables);

      return (
        Number.isFinite(used) &&
        Number.isFinite(expected) &&
        expected > 0 &&
        used < expected
      );
    }).length;
    const unavailableResults = results.filter(
      (result) =>
        result.available === false ||
        result.value === null ||
        result.value === undefined,
    ).length;
    const validScoreCount = scores.length - invalidScores;
    const generalMessage =
      summary.averageScore === null
        ? "Los últimos datos disponibles no permiten calcular una puntuación media válida."
        : `Los últimos datos disponibles incluyen ${
            validScoreCount
          } puntuaciones válidas, con una media descriptiva de ${formatNumber(
            summary.averageScore,
          )}. Resume esta sesión y no representa por sí sola el rendimiento global absoluto.`;
    const capacitiesMessage =
      !bestCapacity || !lowestCapacity
        ? "No hay puntuaciones suficientes para comparar capacidades."
        : bestCapacity.capacity === lowestCapacity.capacity
          ? `Solo hay datos comparables de ${
              bestCapacity.capacity
            }, con una media de ${formatNumber(bestCapacity.average)}.`
          : `La media más alta disponible corresponde a ${
              bestCapacity.capacity
            } (${formatNumber(
              bestCapacity.average,
            )}) y la más baja a ${lowestCapacity.capacity} (${formatNumber(
              lowestCapacity.average,
            )}). La comparación depende de la muestra y variables disponibles.`;
    const coverageMessages = [
      `Hay ${summary.players} jugadores, ${
        summary.capacities
      } capacidades, ${summary.variables} variables, ${
        summary.scores
      } puntuaciones y ${summary.results} resultados registrados.`,
      incompleteScores > 0
        ? `${incompleteScores} puntuaciones utilizan menos variables de las esperadas.`
        : null,
      unavailableResults > 0
        ? `${unavailableResults} resultados figuran como no disponibles o sin valor.`
        : null,
      invalidScores > 0
        ? `${invalidScores} puntuaciones no tienen un valor final válido.`
        : null,
    ].filter((value): value is string => Boolean(value));
    const hasCoverageIssue =
      incompleteScores > 0 || unavailableResults > 0 || invalidScores > 0;
    const recommendationMessage = hasCoverageIssue
      ? "Completar o revisar los datos incompletos antes de comparar perfiles y priorizar las capacidades con menor media solo después de confirmar su cobertura."
      : "Revisar las capacidades con menor media junto a sus variables de origen y al contexto del jugador; una sesión aislada no define rendimiento global ni riesgo.";

    return [
      {
        title: "Estado general",
        variant: "info",
        message: generalMessage,
      },
      {
        title: "Capacidades destacadas",
        variant: "info",
        message: capacitiesMessage,
      },
      {
        title: "Cobertura de datos",
        variant: hasCoverageIssue ? "warning" : "info",
        message: coverageMessages.join(" "),
      },
      {
        title: "Recomendación para el staff",
        variant: hasCoverageIssue ? "warning" : "info",
        message: recommendationMessage,
      },
    ];
  }, [results, scores, summary]);

  return (
    <AppShell
      title="Tests físicos"
      subtitle="Visualización de sesiones de tests guardadas en Supabase. Consulta las puntuaciones por capacidad, los resultados por variable y el ranking general de jugadores."
      actions={
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/cargar-tests"
            className="rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-slate-950 shadow transition hover:bg-slate-100"
          >
            Cargar nueva sesión de tests
          </Link>

          <Link
            href="/cargar"
            className="rounded-xl border border-white/20 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
          >
            Ir a carga de datos
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Sesiones guardadas
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Seleccionar sesión de tests
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Selecciona una sesión para visualizar los resultados físicos
                importados.
              </p>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {selectedTeam
                  ? `Mostrando sesiones de ${getTeamLabel(selectedTeam)}.`
                  : "Selecciona un equipo para evitar mezclar datos de tests."}
              </p>
            </div>

            <div className="grid w-full gap-3 md:w-[480px]">
              <label className="text-sm font-bold text-slate-700">
                Equipo
                <select
                  value={selectedTeamId}
                  onChange={(event) => {
                    void handleTeamChange(event.target.value);
                  }}
                  disabled={savingJumpTest || loadingSessions || teams.length === 0}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">Selecciona equipo</option>

                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {getTeamLabel(team)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-bold text-slate-700">
              Sesión
              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                disabled={
                  savingJumpTest ||
                  loadingSessions ||
                  !selectedTeamId ||
                  sessions.length === 0
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {sessions.length === 0 && (
                  <option value="">No hay sesiones de tests guardadas</option>
                )}

                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_date} · {session.context} ·{" "}
                    {session.session_name}
                  </option>
                ))}
              </select>
            </label>
            </div>
          </div>

          {error && (
            <div className="mt-6">
              <StatusMessage variant="error" title="No se han podido cargar los tests">
                {error}
              </StatusMessage>
            </div>
          )}

          {loadingSessions && (
            <div className="mt-6">
              <StatusMessage variant="info" title="Cargando sesiones de tests">
                Cargando sesiones de tests guardadas en Supabase.
              </StatusMessage>
            </div>
          )}

          {!loadingSessions && teams.length === 0 && (
            <div className="mt-6">
              <StatusMessage
                variant="warning"
                title="No hay equipos disponibles"
              >
                Crea o confirma un equipo antes de consultar tests por equipo.
              </StatusMessage>
            </div>
          )}

          {!loadingSessions && teams.length > 1 && !selectedTeamId && (
            <div className="mt-6">
              <StatusMessage variant="warning" title="Selecciona un equipo">
                Para evitar mezclar datos de varios equipos, selecciona un
                equipo antes de mostrar sesiones, jugadores, resultados,
                puntuaciones, rankings, tablas y lectura rápida de tests.
              </StatusMessage>
            </div>
          )}

          {!loadingSessions && selectedTeamId && sessions.length === 0 && (
            <div className="mt-6">
              <EmptyState
                title="Sin sesiones de tests"
                description="Todavía no hay sesiones de tests guardadas. Primero carga una sesión desde el apartado de carga de tests."
                action={
                  <Link
                    href="/cargar-tests"
                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow hover:bg-slate-800"
                  >
                    Cargar sesión de tests
                  </Link>
                }
              />
            </div>
          )}

          {activeView === "history" && selectedSession && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Fecha</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.session_date}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Contexto</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.context}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Sesión</p>
                <p className="mt-2 break-words text-lg font-black text-slate-950 sm:text-xl">
                  {selectedSession.session_name}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            {TEST_VIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={savingJumpTest}
                onClick={() => handleViewChange(option.id)}
                className={`rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  activeView === option.id
                    ? "bg-slate-950 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {activeView === "history" && catalogMessage && (
          <StatusMessage
            variant={catalogMessage.variant}
            title={catalogMessage.title}
          >
            {catalogMessage.message}
          </StatusMessage>
        )}

        {activeView === "catalog" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
            {(executionStage === "EXECUTION" || executionStage === "REVIEW") &&
            executionDraft ? (
              <>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                      Ejecución de test
                    </p>

                    <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                      {executionDraft.context.testName}
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      Contexto común preparado para ejecutar el test. Los
                      campos específicos se añadirán en los siguientes bloques.
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    {executionStage}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">Equipo</p>
                    <p className="mt-2 break-words text-sm font-black text-slate-950">
                      {selectedTeam
                        ? getTeamLabel(selectedTeam)
                        : executionDraft.context.teamId}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">Jugador</p>
                    <p className="mt-2 break-words text-sm font-black text-slate-950">
                      {selectedCatalogPlayer?.name ??
                        executionDraft.context.playerId}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">Test</p>
                    <p className="mt-2 break-words text-sm font-black text-slate-950">
                      {executionDraft.context.testName}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">
                      Categoría
                    </p>
                    <p className="mt-2 break-words text-sm font-black text-slate-950">
                      {executionDraft.context.testCategory}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">Fecha</p>
                    <p className="mt-2 break-words text-sm font-black text-slate-950">
                      {formatExecutionDate(executionDraft.context.performedAt)}
                    </p>
                  </div>
                </div>

                {catalogMessage && (
                  <div className="mt-6">
                    <StatusMessage
                      variant={catalogMessage.variant}
                      title={catalogMessage.title}
                    >
                      {catalogMessage.message}
                    </StatusMessage>
                  </div>
                )}

                {isCurrentExecutionDropJump && (
                  <DropJumpExecutionForm
                    key={`${executionDraft.context.teamId}:${executionDraft.context.playerId}:${executionDraft.context.testId}`}
                    context={executionDraft.context}
                    hasSelectedPlayer={Boolean(selectedCatalogPlayer)}
                    isSaving={savingJumpTest}
                    onBack={handleBackToTestSetup}
                    onCancel={handleCancelExecution}
                    onReview={(performedAt) => {
                      setExecutionDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              context: {
                                ...currentDraft.context,
                                performedAt,
                              },
                            }
                          : currentDraft,
                      );
                      setCatalogMessage(null);
                      setExecutionStage("REVIEW");
                    }}
                    onReturnToExecution={() => setExecutionStage("EXECUTION")}
                    onSave={(form, summary) => {
                      void handleSaveDropJump(form, summary);
                    }}
                  />
                )}

                {isCurrentExecutionThirtyFifteenIft && (
                  <ThirtyFifteenExecutionForm
                    key={`${executionDraft.context.teamId}:${executionDraft.context.playerId}:${executionDraft.context.testId}`}
                    context={executionDraft.context}
                    hasSelectedPlayer={Boolean(selectedCatalogPlayer)}
                    isSaving={savingJumpTest}
                    onBack={handleBackToTestSetup}
                    onCancel={handleCancelExecution}
                    onReview={(performedAt) => {
                      setExecutionDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              context: {
                                ...currentDraft.context,
                                performedAt,
                              },
                            }
                          : currentDraft,
                      );
                      setCatalogMessage(null);
                      setExecutionStage("REVIEW");
                    }}
                    onReturnToExecution={() => setExecutionStage("EXECUTION")}
                    onSave={(form, summary) => {
                      void handleSaveThirtyFifteenIft(form, summary);
                    }}
                  />
                )}

                {isCurrentExecutionRsa6x30 && (
                  <Rsa6x30ExecutionForm
                    key={`${executionDraft.context.teamId}:${executionDraft.context.playerId}:${executionDraft.context.testId}`}
                    context={executionDraft.context}
                    hasSelectedPlayer={Boolean(selectedCatalogPlayer)}
                    isSaving={savingJumpTest}
                    onBack={handleBackToTestSetup}
                    onCancel={handleCancelExecution}
                    onReview={(performedAt) => {
                      setExecutionDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              context: {
                                ...currentDraft.context,
                                performedAt,
                              },
                            }
                          : currentDraft,
                      );
                      setCatalogMessage(null);
                      setExecutionStage("REVIEW");
                    }}
                    onReturnToExecution={() => setExecutionStage("EXECUTION")}
                    onSave={(form, summary) => {
                      void handleSaveRsa6x30(form, summary);
                    }}
                  />
                )}

                {isCurrentExecutionSprint30 && (
                  <Sprint30ExecutionForm
                    key={`${executionDraft.context.teamId}:${executionDraft.context.playerId}:${executionDraft.context.testId}`}
                    context={executionDraft.context}
                    hasSelectedPlayer={Boolean(selectedCatalogPlayer)}
                    isSaving={savingJumpTest}
                    onBack={handleBackToTestSetup}
                    onCancel={handleCancelExecution}
                    onReview={(performedAt) => {
                      setExecutionDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              context: {
                                ...currentDraft.context,
                                performedAt,
                              },
                            }
                          : currentDraft,
                      );
                      setCatalogMessage(null);
                      setExecutionStage("REVIEW");
                    }}
                    onReturnToExecution={() => setExecutionStage("EXECUTION")}
                    onSave={(form, summary) => {
                      void handleSaveSprint30(form, summary);
                    }}
                  />
                )}

                {isCurrentExecutionAcceleration5m && (
                  <Acceleration5ExecutionForm
                    key={`${executionDraft.context.teamId}:${executionDraft.context.playerId}:${executionDraft.context.testId}`}
                    context={executionDraft.context}
                    hasSelectedPlayer={Boolean(selectedCatalogPlayer)}
                    isSaving={savingJumpTest}
                    onBack={handleBackToTestSetup}
                    onCancel={handleCancelExecution}
                    onReview={(performedAt) => {
                      setExecutionDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              context: {
                                ...currentDraft.context,
                                performedAt,
                              },
                            }
                          : currentDraft,
                      );
                      setCatalogMessage(null);
                      setExecutionStage("REVIEW");
                    }}
                    onReturnToExecution={() => setExecutionStage("EXECUTION")}
                    onSave={(form, summary) => {
                      void handleSaveAcceleration5m(form, summary);
                    }}
                  />
                )}

                {isCurrentExecutionIllinois && (
                  <IllinoisExecutionForm
                    key={`${executionDraft.context.teamId}:${executionDraft.context.playerId}:${executionDraft.context.testId}`}
                    context={executionDraft.context}
                    hasSelectedPlayer={Boolean(selectedCatalogPlayer)}
                    isSaving={savingJumpTest}
                    onBack={handleBackToTestSetup}
                    onCancel={handleCancelExecution}
                    onReview={(performedAt) => {
                      setExecutionDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              context: {
                                ...currentDraft.context,
                                performedAt,
                              },
                            }
                          : currentDraft,
                      );
                      setCatalogMessage(null);
                      setExecutionStage("REVIEW");
                    }}
                    onReturnToExecution={() => setExecutionStage("EXECUTION")}
                    onSave={(form, summary) => {
                      void handleSaveIllinois(form, summary);
                    }}
                  />
                )}

                {isCurrentExecutionSquatVmp && (
                  <SquatVmpExecutionForm
                    key={`${executionDraft.context.teamId}:${executionDraft.context.playerId}:${executionDraft.context.testId}`}
                    context={executionDraft.context}
                    hasSelectedPlayer={Boolean(selectedCatalogPlayer)}
                    isSaving={savingJumpTest}
                    onBack={handleBackToTestSetup}
                    onCancel={handleCancelExecution}
                    onReview={(performedAt) => {
                      setExecutionDraft((currentDraft) => currentDraft ? { ...currentDraft, context: { ...currentDraft.context, performedAt } } : currentDraft);
                      setCatalogMessage(null);
                      setExecutionStage("REVIEW");
                    }}
                    onReturnToExecution={() => setExecutionStage("EXECUTION")}
                    onSave={(form, summary) => { void handleSaveSquatVmp(form, summary); }}
                  />
                )}

                {isCurrentExecutionHipThrustVmp && (
                  <HipThrustVmpExecutionForm
                    key={`${executionDraft.context.teamId}:${executionDraft.context.playerId}:${executionDraft.context.testId}`}
                    context={executionDraft.context}
                    hasSelectedPlayer={Boolean(selectedCatalogPlayer)}
                    isSaving={savingJumpTest}
                    onBack={handleBackToTestSetup}
                    onCancel={handleCancelExecution}
                    onReview={(performedAt) => { setExecutionDraft((currentDraft) => currentDraft ? { ...currentDraft, context: { ...currentDraft.context, performedAt } } : currentDraft); setCatalogMessage(null); setExecutionStage("REVIEW"); }}
                    onReturnToExecution={() => setExecutionStage("EXECUTION")}
                    onSave={(form, summary) => { void handleSaveHipThrustVmp(form, summary); }}
                  />
                )}
                {isCurrentExecutionLoadVelocityProfile && <LoadVelocityProfileExecutionForm key={`${executionDraft.context.teamId}:${executionDraft.context.playerId}:${executionDraft.context.testId}`} context={executionDraft.context} hasSelectedPlayer={Boolean(selectedCatalogPlayer)} isSaving={savingJumpTest} onBack={handleBackToTestSetup} onCancel={handleCancelExecution} onReview={(performedAt)=>{setExecutionDraft(current=>current?{...current,context:{...current.context,performedAt}}:current);setCatalogMessage(null);setExecutionStage("REVIEW")}} onReturnToExecution={()=>setExecutionStage("EXECUTION")} onSave={(form,summary)=>{void handleSaveLoadVelocityProfile(form,summary)}} />}

                {isCurrentExecutionJump && (
                  <>
                    {executionStage === "REVIEW" ? (
                      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                          Revisión antes de guardar
                        </p>

                        <h3 className="mt-2 text-lg font-black text-slate-950">
                          Resumen {activeJumpTitle}
                        </h3>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                          <SummaryCard
                            title="Mejor bipodal"
                            value={
                              activeJumpSummary.bestBipodal === null
                                ? "—"
                                : `${formatNumber(activeJumpSummary.bestBipodal)} cm`
                            }
                          />

                          <SummaryCard
                            title="Mejor derecha"
                            value={
                              activeJumpSummary.bestRight === null
                                ? "—"
                                : `${formatNumber(activeJumpSummary.bestRight)} cm`
                            }
                          />

                          <SummaryCard
                            title="Mejor izquierda"
                            value={
                              activeJumpSummary.bestLeft === null
                                ? "—"
                                : `${formatNumber(activeJumpSummary.bestLeft)} cm`
                            }
                          />

                          <SummaryCard
                            title="Asimetría"
                            value={
                              activeJumpSummary.asymmetry === null
                                ? "—"
                                : `${formatNumber(activeJumpSummary.asymmetry)} %`
                            }
                          />

                          <SummaryCard
                            title="Lado mayor"
                            value={activeJumpSummary.bestSide}
                          />
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-600">
                          Se guardarán todos los intentos válidos, los mejores
                          resultados derivados y la asimetría unilateral cuando
                          corresponda. No se generarán clasificaciones ni
                          puntuaciones normativas.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                          <label className="text-sm font-bold text-slate-700">
                            Fecha del test
                            <input
                              type="date"
                              value={activeJumpForm.performedAt}
                              onChange={(event) =>
                                setActiveJumpForm((currentForm) => ({
                                  ...currentForm,
                                  performedAt: event.target.value,
                                }))
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                            />
                          </label>

                          <label className="text-sm font-bold text-slate-700">
                            Peso corporal (kg)
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={activeJumpForm.bodyMassKg}
                              onChange={(event) =>
                                setActiveJumpForm((currentForm) => ({
                                  ...currentForm,
                                  bodyMassKg: event.target.value,
                                }))
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                              placeholder="Ej. 72.5"
                            />
                          </label>

                          <label className="text-sm font-bold text-slate-700">
                            Modalidad
                            <select
                              value={activeJumpForm.modality}
                              onChange={(event) =>
                                setActiveJumpForm((currentForm) => ({
                                  ...currentForm,
                                  modality: event.target.value as JumpModality,
                                }))
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                            >
                              <option value="BIPODAL">BIPODAL</option>
                              <option value="UNIPODAL">UNIPODAL</option>
                              <option value="AMBOS">AMBOS</option>
                            </select>
                          </label>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                          <p className="text-sm font-black text-slate-950">
                            Dispositivo: {activeJumpDevice}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Introduce altura de salto en centímetros. Puedes
                            registrar entre 1 y {activeJumpMaxAttempts} intentos por
                            modalidad o lado.
                          </p>
                        </div>

                        {activeJumpIncludesBipodal(activeJumpForm.modality) && (
                          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                                Intentos bipodal
                              </h3>
                              <button
                                type="button"
                                onClick={() => handleAddActiveJumpAttempt("BIPODAL")}
                                disabled={
                                  activeJumpForm.bipodalAttempts.length >=
                                  activeJumpMaxAttempts
                                }
                                className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                Añadir intento
                              </button>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              {activeJumpForm.bipodalAttempts.map((attempt, index) => (
                                <label
                                  key={`bipodal-${index}`}
                                  className="text-sm font-bold text-slate-700"
                                >
                                  Intento {index + 1} (cm)
                                  <div className="mt-2 flex gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={attempt}
                                      onChange={(event) =>
                                        handleActiveJumpAttemptChange(
                                          "BIPODAL",
                                          index,
                                          event.target.value,
                                        )
                                      }
                                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveActiveJumpAttempt(
                                          "BIPODAL",
                                          index,
                                        )
                                      }
                                      disabled={
                                        activeJumpForm.bipodalAttempts.length <= 1
                                      }
                                      className="rounded-xl border border-slate-300 px-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeJumpIncludesUnipodal(activeJumpForm.modality) && (
                          <div className="grid gap-4 xl:grid-cols-2">
                            {[
                              {
                                side: "DERECHA" as const,
                                attempts: activeJumpForm.rightAttempts,
                                title: "Intentos derecha",
                              },
                              {
                                side: "IZQUIERDA" as const,
                                attempts: activeJumpForm.leftAttempts,
                                title: "Intentos izquierda",
                              },
                            ].map((group) => (
                              <div
                                key={group.side}
                                className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                                    {group.title}
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddActiveJumpAttempt(group.side)
                                    }
                                    disabled={
                                      group.attempts.length >= activeJumpMaxAttempts
                                    }
                                    className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                                  >
                                    Añadir intento
                                  </button>
                                </div>

                                <div className="mt-4 space-y-3">
                                  {group.attempts.map((attempt, index) => (
                                    <label
                                      key={`${group.side}-${index}`}
                                      className="block text-sm font-bold text-slate-700"
                                    >
                                      Intento {index + 1} (cm)
                                      <div className="mt-2 flex gap-2">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={attempt}
                                          onChange={(event) =>
                                            handleActiveJumpAttemptChange(
                                              group.side,
                                              index,
                                              event.target.value,
                                            )
                                          }
                                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveActiveJumpAttempt(
                                              group.side,
                                              index,
                                            )
                                          }
                                          disabled={group.attempts.length <= 1}
                                          className="rounded-xl border border-slate-300 px-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                                        >
                                          Quitar
                                        </button>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                            Resumen previo
                          </h3>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <SummaryCard
                              title="Mejor bipodal"
                              value={
                                activeJumpSummary.bestBipodal === null
                                  ? "—"
                                  : `${formatNumber(activeJumpSummary.bestBipodal)} cm`
                              }
                            />
                            <SummaryCard
                              title="Mejor derecha"
                              value={
                                activeJumpSummary.bestRight === null
                                  ? "—"
                                  : `${formatNumber(activeJumpSummary.bestRight)} cm`
                              }
                            />
                            <SummaryCard
                              title="Mejor izquierda"
                              value={
                                activeJumpSummary.bestLeft === null
                                  ? "—"
                                  : `${formatNumber(activeJumpSummary.bestLeft)} cm`
                              }
                            />
                            <SummaryCard
                              title="Asimetría"
                              value={
                                activeJumpSummary.asymmetry === null
                                  ? "—"
                                  : `${formatNumber(activeJumpSummary.asymmetry)} %`
                              }
                            />
                            <SummaryCard
                              title="Lado mayor"
                              value={activeJumpSummary.bestSide}
                            />
                          </div>
                        </div>

                        {activeJumpErrors.length > 0 && (
                          <StatusMessage
                            variant="warning"
                            title={`Revisa el ${activeJumpTitle} antes de continuar`}
                          >
                            <ul className="list-inside list-disc">
                              {activeJumpErrors.map((jumpError) => (
                                <li key={jumpError}>{jumpError}</li>
                              ))}
                            </ul>
                          </StatusMessage>
                        )}
                      </div>
                    )}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={
                          executionStage === "REVIEW"
                            ? () => setExecutionStage("EXECUTION")
                            : handleBackToTestSetup
                        }
                        disabled={savingJumpTest}
                        className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Volver
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelExecution}
                        disabled={savingJumpTest}
                        className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Cancelar
                      </button>

                      {executionStage === "REVIEW" ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleSaveActiveJump();
                          }}
                          disabled={savingJumpTest}
                          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                        >
                          {savingJumpTest ? "Guardando..." : "Confirmar y guardar"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleReviewActiveJump}
                          disabled={savingJumpTest}
                          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                        >
                          Revisar
                        </button>
                      )}
                    </div>
                  </>
                )}

                {!isCurrentExecutionJump &&
                  !isCurrentExecutionDropJump &&
                  !isCurrentExecutionThirtyFifteenIft &&
                  !isCurrentExecutionRsa6x30 &&
                  !isCurrentExecutionSprint30 &&
                  !isCurrentExecutionAcceleration5m &&
                  !isCurrentExecutionIllinois &&
                  !isCurrentExecutionSquatVmp &&
                  !isCurrentExecutionHipThrustVmp &&
                  !isCurrentExecutionLoadVelocityProfile && (
                  <>
                    <div className="mt-6">
                  <StatusMessage
                    variant="info"
                    title="Formulario específico pendiente"
                  >
                    Este bloque solo prepara el contrato común de ejecución. No
                    se muestran campos inventados ni se guardan resultados en
                    Supabase.
                  </StatusMessage>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleBackToTestSetup}
                    disabled={savingJumpTest}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    Volver
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelExecution}
                    disabled={savingJumpTest}
                    className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    Cancelar
                  </button>
                    </div>
                  </>
                )}
              </>
            ) : selectedCatalogTest ? (
              <>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                      Test seleccionado
                    </p>

                    <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                      {getCatalogTestName(selectedCatalogTest.name)}
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {getCatalogTestDescription(selectedCatalogTest.name)}
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    {selectedCatalogTest.category}
                  </span>
                </div>

                {catalogMessage && (
                  <div className="mt-6">
                    <StatusMessage
                      variant={catalogMessage.variant}
                      title={catalogMessage.title}
                    >
                      {catalogMessage.message}
                    </StatusMessage>
                  </div>
                )}

                <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5">
                  <label className="text-sm font-bold text-slate-700">
                    Jugador del equipo seleccionado
                    <select
                      value={selectedCatalogPlayerId}
                      onChange={(event) =>
                        setSelectedCatalogPlayerId(event.target.value)
                      }
                      disabled={
                        loadingTeamPlayers ||
                        savingJumpTest ||
                        !selectedTeamId ||
                        teamPlayers.length === 0
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {loadingTeamPlayers
                          ? "Cargando jugadores activos"
                          : "Selecciona jugador"}
                      </option>

                      {teamPlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                          {player.position ? ` · ${player.position}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {selectedTeam
                      ? `Mostrando solo jugadores activos de ${getTeamLabel(
                          selectedTeam,
                        )}.`
                      : "Selecciona un equipo para cargar sus jugadores activos."}
                  </p>
                </div>

                {selectedTeamId &&
                  !loadingTeamPlayers &&
                  teamPlayers.length === 0 && (
                    <div className="mt-6">
                      <EmptyState
                        title="Sin jugadores activos"
                        description="No hay jugadores activos disponibles para iniciar este test en el equipo seleccionado."
                      />
                    </div>
                  )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleBackToCatalog}
                    disabled={savingJumpTest}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    Volver
                  </button>

                  <button
                    type="button"
                    onClick={handleContinueCatalogTest}
                    disabled={savingJumpTest || !selectedCatalogPlayerId}
                    className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                      Catálogo ejecutable
                    </p>

                    <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                      Realizar tests
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      Selecciona un test del catálogo para preparar la toma de
                      datos. En este bloque todavía no se guardan resultados ni
                      se abren formularios específicos.
                    </p>
                  </div>
                </div>

                {!selectedTeamId && (
                  <div className="mt-6">
                    <StatusMessage variant="warning" title="Selecciona un equipo">
                      Para abrir un test, selecciona antes un equipo y trabaja
                      solo con sus jugadores activos.
                    </StatusMessage>
                  </div>
                )}

                {catalogMessage && (
                  <div className="mt-6">
                    <StatusMessage
                      variant={catalogMessage.variant}
                      title={catalogMessage.title}
                    >
                      {catalogMessage.message}
                    </StatusMessage>
                  </div>
                )}

                <div className="mt-6 space-y-7">
                  {TEST_CATALOG_GROUPS.map((group) => (
                    <div key={group.category}>
                      <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                        {group.category}
                      </h3>

                      <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {group.tests.map((test) => (
                          <article
                            key={`${test.category}-${test.name}`}
                            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                {test.category}
                              </p>

                              <h4 className="mt-2 text-base font-black text-slate-950">
                                {getCatalogTestName(test.name)}
                              </h4>

                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {getCatalogTestDescription(test.name)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                void handleOpenCatalogTest(test);
                              }}
                              disabled={savingJumpTest}
                              className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                            >
                              Abrir test
                            </button>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeView === "history" && selectedSessionId && (
          <section>
            {loadingData ? (
              <StatusMessage variant="info" title="Cargando resultados de tests">
                Cargando puntuaciones por capacidad y resultados por variable de
                la sesión seleccionada.
              </StatusMessage>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <SummaryCard title="Jugadores" value={summary.players} />

                  <SummaryCard title="Capacidades" value={summary.capacities} />

                  <SummaryCard title="Variables" value={summary.variables} />

                  <SummaryCard
                    title="Puntuación media"
                    value={formatNumber(summary.averageScore)}
                  />
                </div>

                {(scores.length > 0 || results.length > 0) && (
                  <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                      Interpretación de tests
                    </p>

                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      Lectura rápida de tests
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Señales orientativas a partir de los últimos datos
                      disponibles de la sesión seleccionada.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {quickTestReadingCards.map((card) => (
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

                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                        Filtro
                      </p>

                      <h2 className="mt-2 text-xl font-black text-slate-950">
                        Análisis por capacidad
                      </h2>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        Filtra los resultados para analizar una capacidad
                        concreta o revisa todas las puntuaciones de la sesión.
                      </p>
                    </div>

                    <label className="w-full text-sm font-bold text-slate-700 md:w-[320px]">
                      Capacidad
                      <select
                        value={selectedCapacity}
                        onChange={(event) =>
                          setSelectedCapacity(event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="all">Todas las capacidades</option>

                        {capacityOptions.map((capacity) => (
                          <option key={capacity} value={capacity}>
                            {capacity}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                      Ranking general
                    </h3>

                    {rankingRows.length === 0 ? (
                      <div className="mt-4">
                        <EmptyState
                          title="Sin ranking disponible"
                          description="No hay puntuaciones disponibles para generar el ranking general de jugadores."
                        />
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {rankingRows.slice(0, 10).map((row, index) => (
                          <div
                            key={`${row.playerName}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">
                                {index + 1}
                              </div>

                              <div className="min-w-0">
                                <p className="break-words text-sm font-bold text-slate-950">
                                  {row.playerName}
                                </p>
                                <p className="break-words text-xs font-bold text-slate-500">
                                  {row.position ?? "Sin posición"}
                                </p>
                              </div>
                            </div>

                            <p className="shrink-0 text-sm font-black text-slate-900">
                              {formatNumber(row.averageScore)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow xl:col-span-2">
                    <div className="border-b border-slate-200 p-5">
                      <h2 className="text-xl font-black text-slate-950">
                        Puntuación por capacidad
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Puntuación final calculada para cada jugador y
                        capacidad.
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100 md:hidden">
                      {filteredScores.map((score) => (
                        <article key={score.id} className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-base font-black text-slate-950">
                                {score.player_name}
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {score.position ?? "Sin posición"} ·{" "}
                                {score.capacity}
                              </p>
                            </div>

                            <ClassificationBadge
                              classification={score.classification}
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                Puntuación
                              </p>
                              <p className="mt-1 text-2xl font-black text-slate-950">
                                {formatNumber(score.final_score)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                Variables
                              </p>
                              <p className="mt-1 font-black text-slate-950">
                                {score.used_variables ?? "—"}/
                                {score.expected_variables ?? "—"}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}

                      {filteredScores.length === 0 && (
                        <div className="p-5">
                          <EmptyState
                            title="Sin puntuaciones"
                            description="No hay puntuaciones para esta selección. Cambia la capacidad o carga una sesión con puntuaciones válidas."
                          />
                        </div>
                      )}
                    </div>

                    <div className="hidden max-h-[520px] overflow-auto md:block">
                      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                        <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Jugador</th>
                            <th className="px-4 py-3">Posición</th>
                            <th className="px-4 py-3">Capacidad</th>
                            <th className="px-4 py-3">Puntuación</th>
                            <th className="px-4 py-3">Clasificación</th>
                            <th className="px-4 py-3">Variables</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredScores.map((score) => (
                            <tr
                              key={score.id}
                              className="border-t border-slate-100"
                            >
                              <td className="px-4 py-3 font-black">
                                {score.player_name}
                              </td>

                              <td className="px-4 py-3">
                                {score.position ?? "—"}
                              </td>

                              <td className="px-4 py-3 font-bold">
                                {score.capacity}
                              </td>

                              <td className="px-4 py-3 font-black">
                                {formatNumber(score.final_score)}
                              </td>

                              <td className="px-4 py-3">
                                <ClassificationBadge
                                  classification={score.classification}
                                />
                              </td>

                              <td className="px-4 py-3">
                                {score.used_variables ?? "—"}/
                                {score.expected_variables ?? "—"}
                              </td>
                            </tr>
                          ))}

                          {filteredScores.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-6">
                                <EmptyState
                                  title="Sin puntuaciones"
                                  description="No hay puntuaciones para esta selección. Cambia la capacidad o carga una sesión con puntuaciones válidas."
                                />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                  <div className="border-b border-slate-200 p-5">
                    <h2 className="text-xl font-black text-slate-950">
                      Resultados por variable
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Tabla completa con los valores originales, ponderaciones y
                      clasificación por variable.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 md:hidden">
                    {filteredResults.map((result) => (
                      <article key={result.id} className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-black text-slate-950">
                              {result.player_name}
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {result.position ?? "Sin posición"} ·{" "}
                              {result.test_block}
                            </p>
                          </div>

                          <ClassificationBadge
                            classification={result.classification}
                          />
                        </div>

                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Variable
                          </p>

                          <p className="mt-1 break-words text-sm font-black text-slate-950">
                            {result.variable}
                          </p>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Valor
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatValue(result.value, result.unit)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Puntuación
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatNumber(result.variable_score)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Peso original
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatNumber(result.original_weight)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Peso usado
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatNumber(result.used_weight)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Disponible
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {result.available === false ? "No" : "Sí"}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}

                    {filteredResults.length === 0 && (
                      <div className="p-5">
                        <EmptyState
                          title="Sin resultados por variable"
                          description="No hay resultados por variable para esta selección. Cambia la capacidad o revisa la sesión de tests cargada."
                        />
                      </div>
                    )}
                  </div>

                  <div className="hidden max-h-[620px] overflow-auto md:block">
                    <table className="w-full min-w-[1300px] border-collapse text-left text-sm">
                      <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Jugador</th>
                          <th className="px-4 py-3">Posición</th>
                          <th className="px-4 py-3">Bloque</th>
                          <th className="px-4 py-3">Variable</th>
                          <th className="px-4 py-3">Valor</th>
                          <th className="px-4 py-3">Peso original</th>
                          <th className="px-4 py-3">Peso usado</th>
                          <th className="px-4 py-3">Puntuación variable</th>
                          <th className="px-4 py-3">Clasificación</th>
                          <th className="px-4 py-3">Disponible</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredResults.map((result) => (
                          <tr
                            key={result.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3 font-black">
                              {result.player_name}
                            </td>

                            <td className="px-4 py-3">
                              {result.position ?? "—"}
                            </td>

                            <td className="px-4 py-3 font-bold">
                              {result.test_block}
                            </td>

                            <td className="px-4 py-3">{result.variable}</td>

                            <td className="px-4 py-3 font-black">
                              {formatValue(result.value, result.unit)}
                            </td>

                            <td className="px-4 py-3">
                              {formatNumber(result.original_weight)}
                            </td>

                            <td className="px-4 py-3">
                              {formatNumber(result.used_weight)}
                            </td>

                            <td className="px-4 py-3">
                              {formatNumber(result.variable_score)}
                            </td>

                            <td className="px-4 py-3">
                              <ClassificationBadge
                                classification={result.classification}
                              />
                            </td>

                            <td className="px-4 py-3">
                              {result.available === false ? "No" : "Sí"}
                            </td>
                          </tr>
                        ))}

                        {filteredResults.length === 0 && (
                          <tr>
                            <td colSpan={10} className="px-4 py-6">
                              <EmptyState
                                title="Sin resultados por variable"
                                description="No hay resultados por variable para esta selección. Cambia la capacidad o revisa la sesión de tests cargada."
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

