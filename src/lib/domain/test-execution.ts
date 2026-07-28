import { TEST_CATEGORIES, type TestCategory } from "@/lib/domain/performance";

export type TestExecutionContext = {
  teamId: string;
  playerId: string;
  testId: string;
  testName: string;
  testCategory: TestCategory;
  performedAt: string;
};

export const TEST_LATERALITIES = [
  "BIPODAL",
  "UNIPODAL",
  "NO_APLICA",
] as const;

export type TestLaterality = (typeof TEST_LATERALITIES)[number];

export const TEST_SIDES = ["DERECHA", "IZQUIERDA", "NO_APLICA"] as const;

export type TestSide = (typeof TEST_SIDES)[number];

export const TEST_EXECUTION_STAGES = [
  "CATALOG",
  "SETUP",
  "EXECUTION",
  "REVIEW",
] as const;

export type TestExecutionStage = (typeof TEST_EXECUTION_STAGES)[number];

export type TestInputValue = {
  id: string;
  label: string;
  value: number | string | null;
  unit?: string;
  side?: TestSide;
  attempt?: number;
};

export type TestExecutionDraft = {
  context: TestExecutionContext;
  laterality: TestLaterality;
  values: TestInputValue[];
  observations: string;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function createEmptyTestExecutionDraft(
  context: TestExecutionContext,
): TestExecutionDraft {
  return {
    context,
    laterality: "NO_APLICA",
    values: [],
    observations: "",
  };
}

export function isTestExecutionContextComplete(
  context: Partial<TestExecutionContext> | null | undefined,
): context is TestExecutionContext {
  return (
    Boolean(context) &&
    hasText(context?.teamId) &&
    hasText(context?.playerId) &&
    hasText(context?.testId) &&
    hasText(context?.testName) &&
    TEST_CATEGORIES.includes(context?.testCategory as TestCategory) &&
    hasText(context?.performedAt)
  );
}
