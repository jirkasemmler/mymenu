import { Meal, MealPlanItem } from "./types";

/**
 * Vygeneruje vyvážený týdenní plán z katalogu jídel.
 * Pravidla:
 * - Neopakovat stejné jídlo v týdnu
 * - Neopakovat stejné jídlo dva dny po sobě
 * - Střídat masová a bezmasá jídla (ne celý týden maso)
 */
export function generateWeekPlan(
  meals: Meal[],
  lockedItems: MealPlanItem[] = []
): { day: number; meal_type: string; meal_id: number }[] {
  if (meals.length === 0) return [];

  const plan: { day: number; meal_type: string; meal_id: number }[] = [];
  const usedMealIds = new Set<number>();
  const lockedBySlot = new Map<string, number>();

  // Zamknuté sloty
  for (const item of lockedItems) {
    const key = `${item.day}-${item.meal_type}`;
    lockedBySlot.set(key, item.meal_id);
    usedMealIds.add(item.meal_id);
    plan.push({ day: item.day, meal_type: item.meal_type, meal_id: item.meal_id });
  }

  // Pro každý den a typ jídla
  for (let day = 0; day < 7; day++) {
    for (const mealType of ["oběd", "večeře"]) {
      const key = `${day}-${mealType}`;
      if (lockedBySlot.has(key)) continue;

      const prevSlots = plan.filter(
        (p) => p.day === day - 1 || (p.day === day && p.meal_type !== mealType)
      );
      const prevMealIds = new Set(prevSlots.map((p) => p.meal_id));

      // Najdi poslední masové/bezmasé jídlo
      const recentPlan = plan.filter((p) => p.day >= day - 2);
      const recentMeals = recentPlan.map((p) => meals.find((m) => m.id === p.meal_id));
      const recentMeatCount = recentMeals.filter((m) =>
        m?.tags.includes("maso")
      ).length;
      const preferMeatless = recentMeatCount >= 2;

      // Filtruj dostupná jídla
      let available = meals.filter((m) => {
        if (usedMealIds.has(m.id)) return false;
        if (prevMealIds.has(m.id)) return false;
        return true;
      });

      // Preferuj bezmasé pokud bylo moc masa
      if (preferMeatless && available.some((m) => m.tags.includes("bezmasé"))) {
        const meatless = available.filter((m) => m.tags.includes("bezmasé"));
        if (meatless.length > 0) available = meatless;
      }

      // Pokud není nic dostupné, uvolni omezení na unikátnost
      if (available.length === 0) {
        available = meals.filter((m) => !prevMealIds.has(m.id));
      }
      if (available.length === 0) {
        available = [...meals];
      }

      // Random výběr
      const pick = available[Math.floor(Math.random() * available.length)];
      plan.push({ day, meal_type: mealType, meal_id: pick.id });
      usedMealIds.add(pick.id);
    }
  }

  return plan.filter((p) => !lockedBySlot.has(`${p.day}-${p.meal_type}`));
}

/**
 * Vygeneruje náhradní jídlo pro jeden slot.
 */
export function regenerateSlot(
  meals: Meal[],
  currentPlan: MealPlanItem[],
  day: number,
  mealType: string
): number | null {
  const usedInWeek = new Set(currentPlan.map((p) => p.meal_id));
  const adjacentMealIds = new Set(
    currentPlan
      .filter(
        (p) =>
          (p.day === day - 1 || p.day === day + 1 || p.day === day) &&
          !(p.day === day && p.meal_type === mealType)
      )
      .map((p) => p.meal_id)
  );

  let available = meals.filter(
    (m) => !usedInWeek.has(m.id) && !adjacentMealIds.has(m.id)
  );

  if (available.length === 0) {
    available = meals.filter((m) => !adjacentMealIds.has(m.id));
  }
  if (available.length === 0) {
    available = [...meals];
  }

  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)].id;
}

/**
 * Vrátí pondělí aktuálního týdne.
 */
export function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}
