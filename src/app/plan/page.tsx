"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { Meal, MealPlanItem, DAY_NAMES, MEAL_TYPES } from "@/lib/types";
import { generateWeekPlan, regenerateSlot, getCurrentMonday } from "@/lib/planner";

export default function PlanPage() {
  const supabase = createClient();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [planItems, setPlanItems] = useState<MealPlanItem[]>([]);
  const [planId, setPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [swapSlot, setSwapSlot] = useState<{ day: number; meal_type: string } | null>(null);

  const weekStart = getCurrentMonday();

  const fetchData = useCallback(async () => {
    const [mealsRes, planRes] = await Promise.all([
      supabase.from("meals").select("*"),
      supabase
        .from("meal_plans")
        .select("*, meal_plan_items(*, meals(*))")
        .eq("week_start", weekStart)
        .limit(1)
        .single(),
    ]);

    setMeals(mealsRes.data || []);

    if (planRes.data) {
      setPlanId(planRes.data.id);
      setPlanItems(planRes.data.meal_plan_items || []);
    }

    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleGenerate() {
    if (meals.length < 3) {
      alert("Přidej alespoň 3 jídla do katalogu, aby šel plán vygenerovat.");
      return;
    }

    // Zamknuté položky zůstanou
    const locked = planItems.filter((item) => item.locked);
    const newItems = generateWeekPlan(meals, locked);

    // Smaž starý plán (pokud existuje)
    if (planId) {
      await supabase.from("meal_plan_items").delete().eq("meal_plan_id", planId).eq("locked", false);
    }

    // Vytvoř plán pokud neexistuje
    let currentPlanId = planId;
    if (!currentPlanId) {
      const { data } = await supabase
        .from("meal_plans")
        .insert({ week_start: weekStart })
        .select()
        .single();
      currentPlanId = data!.id;
      setPlanId(currentPlanId);
    }

    // Vlož nové položky
    if (newItems.length > 0) {
      await supabase.from("meal_plan_items").insert(
        newItems.map((item) => ({
          meal_plan_id: currentPlanId,
          meal_id: item.meal_id,
          day: item.day,
          meal_type: item.meal_type,
          locked: false,
        }))
      );
    }

    fetchData();
  }

  async function handleRegenSlot(day: number, mealType: string) {
    const newMealId = regenerateSlot(meals, planItems, day, mealType);
    if (!newMealId) return;

    const item = planItems.find((p) => p.day === day && p.meal_type === mealType);
    if (item) {
      await supabase
        .from("meal_plan_items")
        .update({ meal_id: newMealId, locked: false })
        .eq("id", item.id);
    }

    fetchData();
  }

  async function handleSwap(day: number, mealType: string, newMealId: number) {
    const item = planItems.find((p) => p.day === day && p.meal_type === mealType);
    if (item) {
      await supabase
        .from("meal_plan_items")
        .update({ meal_id: newMealId, locked: true })
        .eq("id", item.id);
    }
    setSwapSlot(null);
    fetchData();
  }

  async function toggleLock(item: MealPlanItem) {
    await supabase
      .from("meal_plan_items")
      .update({ locked: !item.locked })
      .eq("id", item.id);
    fetchData();
  }

  function getMealForSlot(day: number, mealType: string): MealPlanItem | undefined {
    return planItems.find((p) => p.day === day && p.meal_type === mealType);
  }

  if (loading) {
    return <p className="text-gray-500">Načítám...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Týdenní plán</h1>
          <p className="text-sm text-gray-500">Týden od {weekStart}</p>
        </div>
        <button
          onClick={handleGenerate}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
        >
          {planItems.length > 0 ? "🔄 Přegenerovat" : "✨ Vygenerovat plán"}
        </button>
      </div>

      {meals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Nejdřív přidej jídla</p>
          <p className="text-sm">
            Jdi do{" "}
            <a href="/jidla" className="underline">
              katalogu jídel
            </a>{" "}
            a přidej co umíte vařit.
          </p>
        </div>
      ) : planItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Plán je prázdný</p>
          <p className="text-sm">Klikni na &quot;Vygenerovat plán&quot; a jídelníček se vytvoří automaticky.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {DAY_NAMES.map((dayName, dayIndex) => (
            <div key={dayIndex} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="font-medium text-gray-900">{dayName}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {MEAL_TYPES.map((mealType) => {
                  const item = getMealForSlot(dayIndex, mealType);
                  const meal = item?.meals;
                  const isSwapping =
                    swapSlot?.day === dayIndex && swapSlot?.meal_type === mealType;

                  return (
                    <div key={mealType} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-gray-400 w-12 shrink-0">
                          {mealType}
                        </span>
                        {meal ? (
                          <div className="min-w-0">
                            <span className="text-gray-900">{meal.name}</span>
                            {meal.tags.length > 0 && (
                              <div className="flex gap-1 mt-0.5">
                                {meal.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                      {item && (
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button
                            onClick={() => toggleLock(item)}
                            className="p-1 text-sm"
                            title={item.locked ? "Odemknout" : "Zamknout"}
                          >
                            {item.locked ? "🔒" : "🔓"}
                          </button>
                          <button
                            onClick={() =>
                              setSwapSlot(
                                isSwapping ? null : { day: dayIndex, meal_type: mealType }
                              )
                            }
                            className="p-1 text-sm"
                            title="Vyměnit za jiné"
                          >
                            🔄
                          </button>
                          <button
                            onClick={() => handleRegenSlot(dayIndex, mealType)}
                            className="p-1 text-sm"
                            title="Náhodné jiné"
                          >
                            🎲
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Swap picker */}
              {swapSlot &&
                (swapSlot.day === dayIndex) && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Vyber náhradní jídlo:</p>
                    <div className="flex flex-wrap gap-1">
                      {meals
                        .filter(
                          (m) =>
                            !planItems.some(
                              (p) => p.meal_id === m.id && p.day === dayIndex && p.meal_type === swapSlot.meal_type
                            )
                        )
                        .map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleSwap(dayIndex, swapSlot.meal_type, m.id)}
                            className="px-2 py-1 bg-white border border-gray-200 rounded text-sm hover:border-gray-400 transition-colors"
                          >
                            {m.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
