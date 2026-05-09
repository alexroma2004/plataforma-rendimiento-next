import type { GpsMetricKey, GpsMetricTargetMap, MicrocycleDay } from "@/types";

export const GPS_METRICS: {
  key: GpsMetricKey;
  label: string;
  unit: string;
}[] = [
  {
    key: "total_distance",
    label: "Distancia total",
    unit: "m",
  },
  {
    key: "hsr",
    label: "HSR",
    unit: "m",
  },
  {
    key: "sprints",
    label: "Sprints",
    unit: "n",
  },
  {
    key: "distance_vrange6",
    label: "Distancia sprint",
    unit: "m",
  },
  {
    key: "num_acc",
    label: "Aceleraciones",
    unit: "n",
  },
  {
    key: "num_dec",
    label: "Deceleraciones",
    unit: "n",
  },
];

export const DAILY_GPS_TARGETS: Record<
  Exclude<MicrocycleDay, "PARTIDO">,
  GpsMetricTargetMap
> = {
  "MD-4": {
    total_distance: { min: 50, max: 60 },
    distance_vrange6: { min: 5, max: 10 },
    hsr: { min: 10, max: 20 },
    sprints: { min: 5, max: 10 },
    num_acc: { min: 75, max: 85 },
    num_dec: { min: 75, max: 85 },
  },
  "MD-3": {
    total_distance: { min: 65, max: 75 },
    distance_vrange6: { min: 65, max: 75 },
    hsr: { min: 65, max: 80 },
    sprints: { min: 65, max: 75 },
    num_acc: { min: 40, max: 50 },
    num_dec: { min: 40, max: 50 },
  },
  "MD-2": {
    total_distance: { min: 35, max: 45 },
    distance_vrange6: { min: 5, max: 15 },
    hsr: { min: 10, max: 15 },
    sprints: { min: 5, max: 15 },
    num_acc: { min: 20, max: 30 },
    num_dec: { min: 20, max: 30 },
  },
  "MD-1": {
    total_distance: { min: 20, max: 30 },
    distance_vrange6: { min: 0, max: 5 },
    hsr: { min: 5, max: 10 },
    sprints: { min: 0, max: 5 },
    num_acc: { min: 10, max: 20 },
    num_dec: { min: 10, max: 20 },
  },
  "MD+1": {
    total_distance: { min: 60, max: 70 },
    distance_vrange6: { min: 70, max: 80 },
    hsr: { min: 80, max: 90 },
    sprints: { min: 70, max: 80 },
    num_acc: { min: 60, max: 80 },
    num_dec: { min: 60, max: 80 },
  },
  "MD+2": {
    total_distance: { min: 0, max: 30 },
    distance_vrange6: { min: 0, max: 20 },
    hsr: { min: 0, max: 20 },
    sprints: { min: 0, max: 20 },
    num_acc: { min: 0, max: 30 },
    num_dec: { min: 0, max: 30 },
  },
};

export const WEEKLY_GPS_TARGETS: GpsMetricTargetMap = {
  total_distance: { min: 170, max: 210 },
  distance_vrange6: { min: 75, max: 105 },
  hsr: { min: 90, max: 125 },
  sprints: { min: 75, max: 105 },
  num_acc: { min: 145, max: 185 },
  num_dec: { min: 145, max: 185 },
};

export const GOALKEEPER_NAMES = [
  "leja",
  "gonzalo (p)",
  "gonzalo p",
  "portero",
];

export function getGpsMetricLabel(metric: GpsMetricKey): string {
  return GPS_METRICS.find((item) => item.key === metric)?.label ?? metric;
}

export function getGpsMetricUnit(metric: GpsMetricKey): string {
  return GPS_METRICS.find((item) => item.key === metric)?.unit ?? "";
}