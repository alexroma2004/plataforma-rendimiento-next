export const PLAYER_POSITIONS = [
  "PORTERO",
  "LATERAL IZQUIERDO",
  "LATERAL DERECHO",
  "DEFENSA CENTRAL",
  "PIVOTE",
  "MEDIOCENTRO",
  "MEDIAPUNTA",
  "EXTREMO IZQUIERDO",
  "EXTREMO DERECHO",
  "DELANTERO",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const DOMINANT_FEET = [
  "DERECHO",
  "IZQUIERDO",
  "AMBIDIESTRO",
] as const;

export type DominantFoot = (typeof DOMINANT_FEET)[number];

export const FORMATIONS = [
  "4-3-3",
  "4-2-3-1",
  "4-4-2",
  "3-5-2",
  "3-4-3",
  "5-3-2",
  "5-2-3",
] as const;

export type FormationName = (typeof FORMATIONS)[number];

export const TEST_CATEGORIES = [
  "FUERZA",
  "VELOCIDAD",
  "SALTO",
  "RESISTENCIA",
  "AGILIDAD",
] as const;

export type TestCategory = (typeof TEST_CATEGORIES)[number];

export const TEST_DEFINITIONS = [
  {
    category: "FUERZA",
    tests: [
      "PERFIL CARGA VELOCIDAD",
      "PERFIL FUERZA VELOCIDAD",
      "VMP SENTADILLA",
      "VMP HIP THRUST",
    ],
  },
  {
    category: "VELOCIDAD",
    tests: ["SPRINT 30 M", "ACELERACIÓN 5 M"],
  },
  {
    category: "SALTO",
    tests: ["CMJ", "SJ", "ABALAKOV", "DROP JUMP"],
  },
  {
    category: "RESISTENCIA",
    tests: ["30-15 IFT", "RSA 6 X 30 M"],
  },
  {
    category: "AGILIDAD",
    tests: ["ILLINOIS TEST"],
  },
] as const satisfies readonly {
  category: TestCategory;
  tests: readonly string[];
}[];

export type TestDefinition = (typeof TEST_DEFINITIONS)[number];

export const NEUROMUSCULAR_METRICS = ["CMJ", "RSI MOD", "VMP"] as const;

export type NeuromuscularMetric = (typeof NEUROMUSCULAR_METRICS)[number];

export const READINESS_BANDS = [
  {
    min: 0,
    max: 24,
    name: "rojo oscuro",
  },
  {
    min: 25,
    max: 49,
    name: "rojo",
  },
  {
    min: 50,
    max: 59,
    name: "naranja",
  },
  {
    min: 60,
    max: 69,
    name: "amarillo",
  },
  {
    min: 70,
    max: 89,
    name: "verde claro",
  },
  {
    min: 90,
    max: 100,
    name: "verde oscuro",
  },
] as const;

export type ReadinessBand = (typeof READINESS_BANDS)[number];

export function clampReadiness(score: number) {
  if (!Number.isFinite(score)) return 0;

  return Math.min(100, Math.max(0, score));
}

export function getReadinessBand(score: number): ReadinessBand {
  const clampedScore = Math.floor(clampReadiness(score));

  return (
    READINESS_BANDS.find((band) => {
      return clampedScore >= band.min && clampedScore <= band.max;
    }) ?? READINESS_BANDS[0]
  );
}
