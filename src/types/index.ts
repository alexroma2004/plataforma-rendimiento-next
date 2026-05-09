export type MicrocycleDay =
  | "MD+1"
  | "MD+2"
  | "MD-4"
  | "MD-3"
  | "MD-2"
  | "MD-1"
  | "PARTIDO";

export type RiskLabel =
  | "Estado óptimo"
  | "Buen estado"
  | "Fatiga leve"
  | "Fatiga moderada"
  | "Fatiga crítica"
  | "Sin referencia";

export type GpsStatus =
  | "Bajo"
  | "Adecuado"
  | "Alto"
  | "Sin referencia";

export type PlayerPosition =
  | "POR"
  | "DEF"
  | "LTD"
  | "LTI"
  | "DFC"
  | "MC"
  | "MCD"
  | "MCO"
  | "EXT"
  | "DC"
  | "SIN_POSICION";

export type NeuromuscularRecord = {
  id?: string;
  team_id?: string;

  fecha: string;
  jugador: string;
  posicion?: string | null;
  microciclo: MicrocycleDay;

  cmj_pre?: number | null;
  rsi_pre?: number | null;
  vmp_pre?: number | null;

  cmj_post?: number | null;
  rsi_post?: number | null;
  vmp_post?: number | null;

  carga_sentadilla?: number | null;
  rpe?: number | null;
  notas?: string | null;

  created_at?: string;
  updated_at?: string;
};

export type PlayerProfile = {
  id?: string;
  team_id?: string;
  jugador: string;
  posicion?: string | null;
  peso_corporal?: number | null;
  carga_sentadilla?: number | null;
  es_portero?: boolean;
  updated_at?: string;
};

export type GpsMetricKey =
  | "total_distance"
  | "hsr"
  | "sprints"
  | "distance_vrange6"
  | "num_acc"
  | "num_dec";

export type GpsRecord = {
  id?: string;
  team_id?: string;

  fecha: string;
  jugador: string;
  posicion?: string | null;
  microciclo: MicrocycleDay;

  total_distance?: number | null;
  hsr?: number | null;
  sprints?: number | null;
  distance_vrange6?: number | null;
  num_acc?: number | null;
  num_dec?: number | null;

  time_played?: number | null;
  source_file?: string | null;

  created_at?: string;
  updated_at?: string;
};

export type MatchReference = {
  jugador: string;
  posicion?: string | null;
  source: "perfil propio" | "media posicional" | "sin referencia";
  valid_matches: number;
  last_valid_match?: string | null;

  total_distance?: number | null;
  hsr?: number | null;
  sprints?: number | null;
  distance_vrange6?: number | null;
  num_acc?: number | null;
  num_dec?: number | null;
};

export type GpsTargetRange = {
  min: number;
  max: number;
};

export type GpsMetricTargetMap = Record<GpsMetricKey, GpsTargetRange>;

export type GpsCompliance = {
  metric: GpsMetricKey;
  currentValue: number | null;
  referenceValue: number | null;
  percentOfReference: number | null;
  targetMinPercent: number;
  targetMaxPercent: number;
  targetMinAbsolute: number | null;
  targetMaxAbsolute: number | null;
  missingToMin: number | null;
  marginToMax: number | null;
  status: GpsStatus;
};