export interface Meal {
  id: number;
  name: string;
  description: string | null;
  tags: string[];
  user_id: string | null;
  created_at: string;
}

export interface MealPlan {
  id: number;
  week_start: string;
  user_id: string | null;
  created_at: string;
}

export interface MealPlanItem {
  id: number;
  meal_plan_id: number;
  meal_id: number;
  day: number;
  meal_type: string;
  locked: boolean;
  created_at: string;
  meals?: Meal;
}

export const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
export const MEAL_TYPES = ["oběd", "večeře"] as const;

export interface MealIngredient {
  id: number;
  meal_id: number;
  name: string;
  amount: number | null;
  unit: string | null;
  created_at: string;
}

export const SUGGESTED_TAGS = [
  "maso",
  "bezmasé",
  "rychlé",
  "dětské",
  "těstoviny",
  "polévka",
  "ryba",
  "luštěniny",
];
