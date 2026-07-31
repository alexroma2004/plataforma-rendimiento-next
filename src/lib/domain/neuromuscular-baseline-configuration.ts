import {
  isIsoDate,
  type NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";

export type NeuromuscularBaselineConfigurationMode =
  | "AUTOMATIC"
  | "MANUAL";

export type NeuromuscularBaselineConfigurationEvent = {
  id: string;
  teamId: string;
  playerId: string;
  metric: NeuromuscularMetric;
  mode: NeuromuscularBaselineConfigurationMode;
  manualValue: number | null;
  effectiveFrom: string;
  reason: string | null;
  createdAt: string;
  createdBy: string;
};

export type BaselineConfigurationIdentity = {
  teamId: string;
  playerId: string;
  metric: NeuromuscularMetric;
  date: string;
};

export type EffectiveNeuromuscularBaselineSource =
  | "AUTOMATIC_DEFAULT"
  | "AUTOMATIC_EVENT"
  | "MANUAL_EVENT";

export type EffectiveNeuromuscularBaseline = {
  automaticValue: number | null;
  effectiveValue: number | null;
  source: EffectiveNeuromuscularBaselineSource;
  configurationEvent: NeuromuscularBaselineConfigurationEvent | null;
};

export type ResolveEffectiveNeuromuscularBaselineInput =
  BaselineConfigurationIdentity & {
    automaticValue: number | null;
    events: readonly NeuromuscularBaselineConfigurationEvent[];
  };

const ISO_TIMESTAMP_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i;

function assertCivilDate(value: string, label: string) {
  if (!isIsoDate(value)) {
    throw new Error(`${label} must be a valid ISO civil date (YYYY-MM-DD).`);
  }
}

function getTimestampValue(value: string, eventId: string): number {
  if (!ISO_TIMESTAMP_WITH_TIMEZONE.test(value)) {
    throw new Error(
      `Invalid baseline configuration event "${eventId}": createdAt must be an ISO timestamp with timezone.`,
    );
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(
      `Invalid baseline configuration event "${eventId}": createdAt must be a valid timestamp.`,
    );
  }

  return timestamp;
}

function validateEventTemporalFields(
  event: NeuromuscularBaselineConfigurationEvent,
) {
  assertCivilDate(
    event.effectiveFrom,
    `Invalid baseline configuration event "${event.id}": effectiveFrom`,
  );
  getTimestampValue(event.createdAt, event.id);
}

function validateAppliedEvent(
  event: NeuromuscularBaselineConfigurationEvent,
) {
  validateEventTemporalFields(event);

  if (event.mode === "MANUAL") {
    if (
      typeof event.manualValue !== "number" ||
      !Number.isFinite(event.manualValue) ||
      event.manualValue <= 0
    ) {
      throw new RangeError(
        `Invalid MANUAL baseline configuration event "${event.id}": manualValue must be a finite positive number.`,
      );
    }

    return;
  }

  if (event.mode === "AUTOMATIC") {
    if (event.manualValue !== null) {
      throw new Error(
        `Invalid AUTOMATIC baseline configuration event "${event.id}": manualValue must be null.`,
      );
    }

    return;
  }

  throw new Error(
    `Invalid baseline configuration event "${event.id}": mode is not supported.`,
  );
}

function validateAutomaticValue(value: number | null) {
  if (
    value !== null &&
    (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
  ) {
    throw new RangeError(
      "automaticValue must be a finite positive number or null.",
    );
  }
}

function getMatchingEvents(
  events: readonly NeuromuscularBaselineConfigurationEvent[],
  identity: BaselineConfigurationIdentity,
) {
  assertCivilDate(identity.date, "date");

  return events.filter(
    (event) =>
      event.teamId === identity.teamId &&
      event.playerId === identity.playerId &&
      event.metric === identity.metric,
  );
}

function compareCivilDates(first: string, second: string) {
  return compareLexicographically(first, second);
}

function compareLexicographically(first: string, second: string) {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

/**
 * Orden canónico para eventos ya aplicables: fecha efectiva, instante de
 * creación e id en orden descendente. effectiveFrom sigue siendo fecha civil.
 */
export function compareBaselineConfigurationEventsDescending(
  first: NeuromuscularBaselineConfigurationEvent,
  second: NeuromuscularBaselineConfigurationEvent,
) {
  validateEventTemporalFields(first);
  validateEventTemporalFields(second);

  const effectiveFromOrder = compareCivilDates(
    second.effectiveFrom,
    first.effectiveFrom,
  );

  if (effectiveFromOrder !== 0) return effectiveFromOrder;

  const createdAtOrder =
    getTimestampValue(second.createdAt, second.id) -
    getTimestampValue(first.createdAt, first.id);

  if (createdAtOrder !== 0) return createdAtOrder;

  return compareLexicographically(second.id, first.id);
}

function compareFutureBaselineConfigurationEvents(
  first: NeuromuscularBaselineConfigurationEvent,
  second: NeuromuscularBaselineConfigurationEvent,
) {
  const effectiveFromOrder = compareCivilDates(
    first.effectiveFrom,
    second.effectiveFrom,
  );

  if (effectiveFromOrder !== 0) return effectiveFromOrder;

  return compareBaselineConfigurationEventsDescending(first, second);
}

/** Returns a new array so callers can render history without mutating input. */
export function sortBaselineConfigurationEventsDescending(
  events: readonly NeuromuscularBaselineConfigurationEvent[],
) {
  events.forEach(validateEventTemporalFields);

  return [...events].sort(compareBaselineConfigurationEventsDescending);
}

export function resolveBaselineConfigurationAtDate(
  input: BaselineConfigurationIdentity & {
    events: readonly NeuromuscularBaselineConfigurationEvent[];
  },
) {
  const applicableEvents = getMatchingEvents(input.events, input).filter(
    (event) => {
      validateEventTemporalFields(event);
      return event.effectiveFrom <= input.date;
    },
  );

  return sortBaselineConfigurationEventsDescending(applicableEvents)[0] ?? null;
}

export function resolveEffectiveNeuromuscularBaseline(
  input: ResolveEffectiveNeuromuscularBaselineInput,
): EffectiveNeuromuscularBaseline {
  validateAutomaticValue(input.automaticValue);

  const configurationEvent = resolveBaselineConfigurationAtDate(input);

  if (configurationEvent === null) {
    return {
      automaticValue: input.automaticValue,
      effectiveValue: input.automaticValue,
      source: "AUTOMATIC_DEFAULT",
      configurationEvent: null,
    };
  }

  validateAppliedEvent(configurationEvent);

  if (configurationEvent.mode === "MANUAL") {
    return {
      automaticValue: input.automaticValue,
      effectiveValue: configurationEvent.manualValue,
      source: "MANUAL_EVENT",
      configurationEvent,
    };
  }

  return {
    automaticValue: input.automaticValue,
    effectiveValue: input.automaticValue,
    source: "AUTOMATIC_EVENT",
    configurationEvent,
  };
}

export function getNextBaselineConfigurationEvent(
  input: BaselineConfigurationIdentity & {
    events: readonly NeuromuscularBaselineConfigurationEvent[];
  },
) {
  const futureEvents = getMatchingEvents(input.events, input).filter((event) => {
    validateEventTemporalFields(event);
    return event.effectiveFrom > input.date;
  });

  return [...futureEvents].sort(compareFutureBaselineConfigurationEvents)[0] ?? null;
}
