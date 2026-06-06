export type InsightPriority = "alta" | "media" | "baja";

export type InsightCategory =
  | "gps"
  | "neuromuscular"
  | "tests"
  | "disponibilidad"
  | "general";

export type PerformanceInsight = {
  id: string;
  title: string;
  description: string;
  category: InsightCategory;
  priority: InsightPriority;
  playerName?: string;
  recommendation: string;
};

type BasicGpsRecord = {
  player_name: string;
  session_date?: string | null;
  microcycle?: string | null;
  total_distance: number | null;
  hsr: number | null;
  distance_vrange6: number | null;
  sprints: number | null;
  num_acc: number | null;
  num_dec: number | null;
};

type BasicNeuromuscularRecord = {
  player_name: string;
  session_date?: string | null;
  microcycle?: string | null;
  cmj_pre: number | null;
  cmj_post: number | null;
  rsimod_pre: number | null;
  rsimod_post: number | null;
  vmp_pre: number | null;
  vmp_post: number | null;
  rpe: number | null;
};

type BasicTestScore = {
  player_name: string;
  capacity: string;
  final_score: number | null;
  classification: string | null;
};

type BuildPerformanceInsightsInput = {
  gpsRecords: BasicGpsRecord[];
  neuromuscularRecords: BasicNeuromuscularRecord[];
  testScores: BasicTestScore[];
};

type PlayerGroup<T> = {
  playerName: string;
  rows: T[];
};

function normalizeName(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function slugify(value: string) {
  return normalizeName(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPriorityScore(priority: InsightPriority) {
  if (priority === "alta") return 1;
  if (priority === "media") return 2;
  return 3;
}

function getNumber(value: number | null | undefined) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function getValidNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getPercentChange(
  pre: number | null | undefined,
  post: number | null | undefined,
) {
  const preNumber = getValidNumber(pre);
  const postNumber = getValidNumber(post);

  if (preNumber === null || postNumber === null) return null;
  if (preNumber === 0) return null;

  return ((postNumber - preNumber) / preNumber) * 100;
}

function average(values: number[]) {
  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatNumber(value: number | null | undefined, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("es-ES", {
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
}

function formatMeters(value: number | null | undefined) {
  return `${formatNumber(value, 0)} m`;
}

function groupByPlayer<T extends { player_name: string }>(
  rows: T[],
): Map<string, PlayerGroup<T>> {
  const grouped = new Map<string, PlayerGroup<T>>();

  rows.forEach((row) => {
    const key = normalizeName(row.player_name);

    if (!grouped.has(key)) {
      grouped.set(key, {
        playerName: row.player_name,
        rows: [],
      });
    }

    grouped.get(key)?.rows.push(row);
  });

  return grouped;
}

function hasNegativeClassification(classification: string | null | undefined) {
  const text = String(classification ?? "").toLowerCase();

  return (
    text.includes("bajo") ||
    text.includes("riesgo") ||
    text.includes("deficiente") ||
    text.includes("insuficiente") ||
    text.includes("malo")
  );
}

function pushUniqueInsight(
  insights: PerformanceInsight[],
  insight: PerformanceInsight,
) {
  const alreadyExists = insights.some((item) => item.id === insight.id);

  if (!alreadyExists) {
    insights.push(insight);
  }
}

export function buildPerformanceInsights({
  gpsRecords,
  neuromuscularRecords,
  testScores,
}: BuildPerformanceInsightsInput): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  const gpsByPlayer = groupByPlayer(gpsRecords);
  const neuromuscularByPlayer = groupByPlayer(neuromuscularRecords);
  const scoresByPlayer = groupByPlayer(testScores);

  const gpsSummaries = Array.from(gpsByPlayer.entries()).map(
    ([key, group]) => {
      const totalDistance = group.rows.reduce(
        (sum, record) => sum + getNumber(record.total_distance),
        0,
      );

      const totalHsr = group.rows.reduce(
        (sum, record) => sum + getNumber(record.hsr),
        0,
      );

      const totalSprintDistance = group.rows.reduce(
        (sum, record) => sum + getNumber(record.distance_vrange6),
        0,
      );

      const totalSprints = group.rows.reduce(
        (sum, record) => sum + getNumber(record.sprints),
        0,
      );

      const totalAcc = group.rows.reduce(
        (sum, record) => sum + getNumber(record.num_acc),
        0,
      );

      const totalDec = group.rows.reduce(
        (sum, record) => sum + getNumber(record.num_dec),
        0,
      );

      const sessions = group.rows.length;
      const averageDistance = sessions > 0 ? totalDistance / sessions : 0;
      const averageHsr = sessions > 0 ? totalHsr / sessions : 0;
      const averageSprintDistance =
        sessions > 0 ? totalSprintDistance / sessions : 0;

      const hsrRatio = totalDistance > 0 ? (totalHsr / totalDistance) * 100 : 0;
      const sprintRatio =
        totalDistance > 0 ? (totalSprintDistance / totalDistance) * 100 : 0;

      return {
        key,
        playerName: group.playerName,
        rows: group.rows,
        sessions,
        totalDistance,
        totalHsr,
        totalSprintDistance,
        totalSprints,
        totalAcc,
        totalDec,
        averageDistance,
        averageHsr,
        averageSprintDistance,
        hsrRatio,
        sprintRatio,
      };
    },
  );

  const teamAverageDistance = average(
    gpsSummaries
      .map((summary) => summary.averageDistance)
      .filter((value) => Number.isFinite(value) && value > 0),
  );

  const teamAverageHsr = average(
    gpsSummaries
      .map((summary) => summary.averageHsr)
      .filter((value) => Number.isFinite(value) && value > 0),
  );

  const teamAverageSprint = average(
    gpsSummaries
      .map((summary) => summary.averageSprintDistance)
      .filter((value) => Number.isFinite(value) && value > 0),
  );

  gpsSummaries.forEach((summary) => {
    const playerSlug = slugify(summary.playerName);

    if (
      teamAverageDistance !== null &&
      summary.sessions >= 2 &&
      summary.averageDistance > teamAverageDistance * 1.25
    ) {
      pushUniqueInsight(insights, {
        id: `gps-distance-above-team-${playerSlug}`,
        title: "Distancia media superior al equipo",
        description: `${summary.playerName} presenta una distancia media por sesión de ${formatMeters(
          summary.averageDistance,
        )}, claramente por encima de la media del equipo.`,
        category: "gps",
        priority: "media",
        playerName: summary.playerName,
        recommendation:
          "Revisar si esta mayor exposición responde a su rol, minutos acumulados o necesidades específicas de control de carga.",
      });
    }

    if (
      teamAverageHsr !== null &&
      summary.sessions >= 2 &&
      summary.averageHsr > teamAverageHsr * 1.3
    ) {
      pushUniqueInsight(insights, {
        id: `gps-hsr-above-team-${playerSlug}`,
        title: "HSR superior al promedio del equipo",
        description: `${summary.playerName} acumula una media de ${formatMeters(
          summary.averageHsr,
        )} de HSR por sesión, por encima del comportamiento medio del grupo.`,
        category: "gps",
        priority: "media",
        playerName: summary.playerName,
        recommendation:
          "Controlar la exposición a carrera de alta velocidad y valorar si necesita compensación o reducción de carga.",
      });
    }

    if (
      teamAverageSprint !== null &&
      summary.sessions >= 2 &&
      summary.averageSprintDistance > teamAverageSprint * 1.35
    ) {
      pushUniqueInsight(insights, {
        id: `gps-sprint-above-team-${playerSlug}`,
        title: "Alta exposición a distancia sprint",
        description: `${summary.playerName} presenta una distancia sprint media de ${formatMeters(
          summary.averageSprintDistance,
        )} por sesión, superior al promedio del equipo.`,
        category: "gps",
        priority: "alta",
        playerName: summary.playerName,
        recommendation:
          "Vigilar la tolerancia a esfuerzos de máxima velocidad y revisar la respuesta neuromuscular posterior.",
      });
    }

    if (summary.hsrRatio >= 12 && summary.totalDistance >= 1500) {
      pushUniqueInsight(insights, {
        id: `gps-high-hsr-ratio-${playerSlug}`,
        title: "Alta proporción de HSR",
        description: `${summary.playerName} acumula un ${formatNumber(
          summary.hsrRatio,
          1,
        )}% de su distancia total en HSR.`,
        category: "gps",
        priority: "media",
        playerName: summary.playerName,
        recommendation:
          "Interpretar la carga no solo por volumen total, sino también por la proporción de metros de alta intensidad.",
      });
    }

    if (summary.sprintRatio >= 4 && summary.totalDistance >= 1500) {
      pushUniqueInsight(insights, {
        id: `gps-high-sprint-ratio-${playerSlug}`,
        title: "Alta proporción de sprint",
        description: `${summary.playerName} acumula un ${formatNumber(
          summary.sprintRatio,
          1,
        )}% de su distancia total en zona sprint.`,
        category: "gps",
        priority: "alta",
        playerName: summary.playerName,
        recommendation:
          "Revisar la carga de sprint junto a estado neuromuscular, molestias y proximidad al partido.",
      });
    }

    if (summary.sessions <= 1) {
      pushUniqueInsight(insights, {
        id: `gps-low-data-${playerSlug}`,
        title: "Pocos registros GPS disponibles",
        description: `${summary.playerName} tiene pocos registros GPS cargados en la plataforma.`,
        category: "disponibilidad",
        priority: "baja",
        playerName: summary.playerName,
        recommendation:
          "Aumentar el número de sesiones registradas para mejorar la interpretación individual.",
      });
    }
  });

  neuromuscularRecords.forEach((record) => {
    const playerSlug = slugify(record.player_name);

    const cmjChange = getPercentChange(record.cmj_pre, record.cmj_post);
    const rsiChange = getPercentChange(record.rsimod_pre, record.rsimod_post);
    const vmpChange = getPercentChange(record.vmp_pre, record.vmp_post);

    const negativeChanges = [cmjChange, rsiChange, vmpChange].filter(
      (change): change is number => change !== null && change <= -5,
    );

    if (cmjChange !== null && cmjChange <= -8) {
      pushUniqueInsight(insights, {
        id: `neuro-cmj-drop-${playerSlug}-${record.cmj_pre}-${record.cmj_post}`,
        title: "Caída relevante en CMJ",
        description: `${record.player_name} presenta una caída aproximada del ${formatNumber(
          Math.abs(cmjChange),
          1,
        )}% en CMJ.`,
        category: "neuromuscular",
        priority: "alta",
        playerName: record.player_name,
        recommendation:
          "Valorar fatiga neuromuscular, ajustar carga y revisar evolución en la siguiente medición.",
      });
    } else if (cmjChange !== null && cmjChange <= -5) {
      pushUniqueInsight(insights, {
        id: `neuro-cmj-moderate-drop-${playerSlug}-${record.cmj_pre}-${record.cmj_post}`,
        title: "Descenso moderado en CMJ",
        description: `${record.player_name} presenta un descenso aproximado del ${formatNumber(
          Math.abs(cmjChange),
          1,
        )}% en CMJ.`,
        category: "neuromuscular",
        priority: "media",
        playerName: record.player_name,
        recommendation:
          "Controlar si el descenso se repite en próximas mediciones o coincide con mayor carga externa.",
      });
    }

    if (rsiChange !== null && rsiChange <= -8) {
      pushUniqueInsight(insights, {
        id: `neuro-rsi-drop-${playerSlug}-${record.rsimod_pre}-${record.rsimod_post}`,
        title: "Caída relevante en RSI mod",
        description: `${record.player_name} presenta una caída aproximada del ${formatNumber(
          Math.abs(rsiChange),
          1,
        )}% en RSI mod.`,
        category: "neuromuscular",
        priority: "alta",
        playerName: record.player_name,
        recommendation:
          "Revisar la capacidad reactiva y la respuesta a la carga previa.",
      });
    } else if (rsiChange !== null && rsiChange <= -5) {
      pushUniqueInsight(insights, {
        id: `neuro-rsi-moderate-drop-${playerSlug}-${record.rsimod_pre}-${record.rsimod_post}`,
        title: "Descenso moderado en RSI mod",
        description: `${record.player_name} presenta un descenso aproximado del ${formatNumber(
          Math.abs(rsiChange),
          1,
        )}% en RSI mod.`,
        category: "neuromuscular",
        priority: "media",
        playerName: record.player_name,
        recommendation:
          "Observar si el descenso afecta a la explosividad o a la tolerancia a acciones intensas.",
      });
    }

    if (vmpChange !== null && vmpChange <= -8) {
      pushUniqueInsight(insights, {
        id: `neuro-vmp-high-drop-${playerSlug}-${record.vmp_pre}-${record.vmp_post}`,
        title: "Descenso relevante en VMP",
        description: `${record.player_name} presenta un descenso aproximado del ${formatNumber(
          Math.abs(vmpChange),
          1,
        )}% en VMP.`,
        category: "neuromuscular",
        priority: "alta",
        playerName: record.player_name,
        recommendation:
          "Revisar si el descenso coincide con fatiga, molestias o alta carga acumulada.",
      });
    } else if (vmpChange !== null && vmpChange <= -5) {
      pushUniqueInsight(insights, {
        id: `neuro-vmp-drop-${playerSlug}-${record.vmp_pre}-${record.vmp_post}`,
        title: "Descenso en VMP",
        description: `${record.player_name} presenta un descenso aproximado del ${formatNumber(
          Math.abs(vmpChange),
          1,
        )}% en VMP.`,
        category: "neuromuscular",
        priority: "media",
        playerName: record.player_name,
        recommendation:
          "Contrastar este descenso con CMJ, RSI mod, RPE y carga GPS de la semana.",
      });
    }

    if (record.rpe !== null && Number(record.rpe) >= 9) {
      pushUniqueInsight(insights, {
        id: `rpe-very-high-${playerSlug}-${record.rpe}`,
        title: "RPE muy elevado",
        description: `${record.player_name} reporta un RPE de ${formatNumber(
          record.rpe,
          0,
        )}/10.`,
        category: "neuromuscular",
        priority: "alta",
        playerName: record.player_name,
        recommendation:
          "Valorar percepción de fatiga, carga reciente y posible ajuste de la siguiente sesión.",
      });
    } else if (record.rpe !== null && Number(record.rpe) >= 8) {
      pushUniqueInsight(insights, {
        id: `rpe-high-${playerSlug}-${record.rpe}`,
        title: "RPE elevado",
        description: `${record.player_name} reporta un RPE de ${formatNumber(
          record.rpe,
          0,
        )}/10.`,
        category: "neuromuscular",
        priority: "media",
        playerName: record.player_name,
        recommendation:
          "Contrastar la percepción subjetiva con las variables mecánicas y GPS.",
      });
    }

    if (negativeChanges.length >= 2 && Number(record.rpe ?? 0) >= 7) {
      pushUniqueInsight(insights, {
        id: `integrated-neuro-rpe-fatigue-${playerSlug}-${record.cmj_pre}-${record.cmj_post}-${record.rpe}`,
        title: "Posible fatiga neuromuscular integrada",
        description: `${record.player_name} combina descensos en varias variables neuromusculares con RPE elevado.`,
        category: "neuromuscular",
        priority: "alta",
        playerName: record.player_name,
        recommendation:
          "Priorizar seguimiento individual, revisar carga de los últimos días y valorar ajuste en la exposición de alta intensidad.",
      });
    }
  });

  neuromuscularByPlayer.forEach((group, playerKey) => {
    const playerSlug = slugify(group.playerName);

    const recordsWithRelevantDrop = group.rows.filter((record) => {
      const cmjChange = getPercentChange(record.cmj_pre, record.cmj_post);
      const rsiChange = getPercentChange(record.rsimod_pre, record.rsimod_post);
      const vmpChange = getPercentChange(record.vmp_pre, record.vmp_post);

      return (
        (cmjChange !== null && cmjChange <= -5) ||
        (rsiChange !== null && rsiChange <= -5) ||
        (vmpChange !== null && vmpChange <= -5)
      );
    });

    if (recordsWithRelevantDrop.length >= 2) {
      pushUniqueInsight(insights, {
        id: `neuro-repeated-drops-${playerSlug}`,
        title: "Descensos neuromusculares repetidos",
        description: `${group.playerName} presenta descensos neuromusculares en varias mediciones disponibles.`,
        category: "neuromuscular",
        priority: "alta",
        playerName: group.playerName,
        recommendation:
          "Analizar tendencia individual, carga previa y posible necesidad de intervención o recuperación adicional.",
      });
    }

    const gpsSummary = gpsSummaries.find((summary) => summary.key === playerKey);

    if (
      gpsSummary &&
      (gpsSummary.sprintRatio >= 4 || gpsSummary.hsrRatio >= 12) &&
      recordsWithRelevantDrop.length >= 1
    ) {
      pushUniqueInsight(insights, {
        id: `integrated-gps-neuro-risk-${playerSlug}`,
        title: "Alta intensidad GPS + descenso neuromuscular",
        description: `${group.playerName} combina alta exposición a carrera intensa con al menos un descenso neuromuscular relevante.`,
        category: "general",
        priority: "alta",
        playerName: group.playerName,
        recommendation:
          "Cruzar carga GPS, CMJ, RSI mod, VMP y RPE antes de tomar decisiones sobre carga o disponibilidad.",
      });
    }
  });

  scoresByPlayer.forEach((group, playerKey) => {
    const playerSlug = slugify(group.playerName);

    const validScores = group.rows
      .map((score) => getValidNumber(score.final_score))
      .filter((value): value is number => value !== null);

    const averageScore = average(validScores);

    const negativeScores = group.rows.filter((score) =>
      hasNegativeClassification(score.classification),
    );

    if (averageScore !== null && averageScore < 5) {
      pushUniqueInsight(insights, {
        id: `tests-low-average-${playerSlug}`,
        title: "Perfil físico global bajo",
        description: `${group.playerName} presenta una puntuación media de tests de ${formatNumber(
          averageScore,
          1,
        )}.`,
        category: "tests",
        priority: "alta",
        playerName: group.playerName,
        recommendation:
          "Priorizar trabajo individualizado sobre las capacidades físicas con menor puntuación.",
      });
    } else if (averageScore !== null && averageScore < 6) {
      pushUniqueInsight(insights, {
        id: `tests-moderate-average-${playerSlug}`,
        title: "Perfil físico mejorable",
        description: `${group.playerName} presenta una puntuación media de tests de ${formatNumber(
          averageScore,
          1,
        )}.`,
        category: "tests",
        priority: "media",
        playerName: group.playerName,
        recommendation:
          "Revisar qué capacidades limitan más su perfil y establecer objetivos de mejora específicos.",
      });
    }

    if (negativeScores.length >= 2) {
      pushUniqueInsight(insights, {
        id: `tests-multiple-low-capacities-${playerSlug}`,
        title: "Varias capacidades físicas limitadas",
        description: `${group.playerName} presenta clasificaciones desfavorables en varias capacidades físicas.`,
        category: "tests",
        priority: "alta",
        playerName: group.playerName,
        recommendation:
          "Plantear un plan individualizado priorizando las capacidades con peor clasificación.",
      });
    }

    negativeScores.forEach((score) => {
      pushUniqueInsight(insights, {
        id: `tests-low-capacity-${playerSlug}-${slugify(score.capacity)}`,
        title: `Capacidad limitada: ${score.capacity}`,
        description: `${group.playerName} obtiene una clasificación desfavorable en ${score.capacity}.`,
        category: "tests",
        priority: "media",
        playerName: group.playerName,
        recommendation:
          "Revisar las variables que componen esta capacidad y plantear objetivos de mejora específicos.",
      });
    });

    const neuroGroup = neuromuscularByPlayer.get(playerKey);

    if (averageScore !== null && averageScore < 6 && neuroGroup) {
      const hasNeuroDrop = neuroGroup.rows.some((record) => {
        const cmjChange = getPercentChange(record.cmj_pre, record.cmj_post);
        const rsiChange = getPercentChange(record.rsimod_pre, record.rsimod_post);
        const vmpChange = getPercentChange(record.vmp_pre, record.vmp_post);

        return (
          (cmjChange !== null && cmjChange <= -5) ||
          (rsiChange !== null && rsiChange <= -5) ||
          (vmpChange !== null && vmpChange <= -5)
        );
      });

      if (hasNeuroDrop) {
        pushUniqueInsight(insights, {
          id: `integrated-tests-neuro-alert-${playerSlug}`,
          title: "Perfil físico bajo + respuesta neuromuscular negativa",
          description: `${group.playerName} combina puntuaciones físicas mejorables con descensos neuromusculares registrados.`,
          category: "general",
          priority: "alta",
          playerName: group.playerName,
          recommendation:
            "Revisar el plan individual, controlar evolución neuromuscular y priorizar contenidos de mejora física específica.",
        });
      }
    }
  });

  gpsByPlayer.forEach((group, playerKey) => {
    const playerSlug = slugify(group.playerName);

    if (!neuromuscularByPlayer.has(playerKey)) {
      pushUniqueInsight(insights, {
        id: `availability-no-neuro-${playerSlug}`,
        title: "Sin registros neuromusculares asociados",
        description: `${group.playerName} tiene datos GPS, pero no aparecen registros neuromusculares asociados.`,
        category: "disponibilidad",
        priority: "baja",
        playerName: group.playerName,
        recommendation:
          "Añadir mediciones de CMJ, RSI mod, VMP o RPE para completar la interpretación individual.",
      });
    }

    if (!scoresByPlayer.has(playerKey)) {
      pushUniqueInsight(insights, {
        id: `availability-no-tests-${playerSlug}`,
        title: "Sin puntuaciones de tests asociadas",
        description: `${group.playerName} tiene datos GPS, pero no aparecen puntuaciones de tests físicos asociadas.`,
        category: "disponibilidad",
        priority: "baja",
        playerName: group.playerName,
        recommendation:
          "Cargar o vincular tests físicos para completar su perfil de rendimiento.",
      });
    }
  });

  if (
    gpsRecords.length === 0 &&
    neuromuscularRecords.length === 0 &&
    testScores.length === 0
  ) {
    pushUniqueInsight(insights, {
      id: "general-no-data",
      title: "No hay datos suficientes",
      description:
        "Todavía no existen registros GPS, neuromusculares o de tests suficientes para generar conclusiones automáticas.",
      category: "general",
      priority: "baja",
      recommendation:
        "Carga datos en los módulos de GPS, rendimiento neuromuscular y tests para activar el análisis automático.",
    });
  }

  return insights
    .sort((a, b) => {
      const priorityDifference =
        getPriorityScore(a.priority) - getPriorityScore(b.priority);

      if (priorityDifference !== 0) return priorityDifference;

      const categoryDifference = a.category.localeCompare(b.category);

      if (categoryDifference !== 0) return categoryDifference;

      return a.title.localeCompare(b.title);
    })
    .slice(0, 40);
}