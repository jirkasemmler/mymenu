"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getCurrentMonday } from "@/lib/planner";

const supabase = createClient();

interface ShoppingItem {
  name: string;
  totalAmount: number | null;
  unit: string | null;
  checked: boolean;
}

export default function NakupPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekStart = getCurrentMonday();

  useEffect(() => {
    fetchShoppingList();
  }, []);

  async function fetchShoppingList() {
    setLoading(true);

    // Najdi plán pro aktuální týden
    const { data: plan, error: planError } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("week_start", weekStart)
      .limit(1)
      .single();

    if (planError || !plan) {
      // Plán neexistuje — prázdný stav
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Načti položky plánu → meal_id
    const { data: planItems, error: itemsError } = await supabase
      .from("meal_plan_items")
      .select("meal_id")
      .eq("meal_plan_id", plan.id);

    if (itemsError) {
      console.error("Chyba při načítání plánu:", itemsError);
      setError("Nepodařilo se načíst plán.");
      setLoading(false);
      return;
    }

    if (!planItems || planItems.length === 0) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Unikátní meal_id (jídlo se může opakovat v plánu)
    const mealIds = planItems.map((p) => p.meal_id);

    // Spočítej kolikrát se každé jídlo v plánu vyskytuje
    const mealCounts: Record<number, number> = {};
    for (const id of mealIds) {
      mealCounts[id] = (mealCounts[id] || 0) + 1;
    }

    const uniqueMealIds = [...new Set(mealIds)];

    // Načti suroviny pro všechna jídla v plánu
    const { data: ingredients, error: ingError } = await supabase
      .from("meal_ingredients")
      .select("*")
      .in("meal_id", uniqueMealIds);

    if (ingError) {
      console.error("Chyba při načítání surovin:", ingError);
      setError("Nepodařilo se načíst suroviny.");
      setLoading(false);
      return;
    }

    if (!ingredients || ingredients.length === 0) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Agreguj suroviny — sečti stejné (název + jednotka)
    const aggregated = new Map<string, { totalAmount: number | null; unit: string | null }>();

    for (const ing of ingredients) {
      const key = `${ing.name.toLowerCase().trim()}|${(ing.unit || "").toLowerCase().trim()}`;
      const count = mealCounts[ing.meal_id] || 1;
      const existing = aggregated.get(key);

      if (existing) {
        if (ing.amount != null && existing.totalAmount != null) {
          existing.totalAmount += ing.amount * count;
        } else if (ing.amount != null) {
          existing.totalAmount = ing.amount * count;
        }
      } else {
        aggregated.set(key, {
          totalAmount: ing.amount != null ? ing.amount * count : null,
          unit: ing.unit || null,
        });
      }
    }

    // Převeď na pole a seřaď abecedně
    const result: ShoppingItem[] = [];
    for (const [key, val] of aggregated) {
      const name = key.split("|")[0];
      // Velké první písmeno
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      result.push({
        name: displayName,
        totalAmount: val.totalAmount,
        unit: val.unit,
        checked: false,
      });
    }

    result.sort((a, b) => a.name.localeCompare(b.name, "cs"));

    // Obnov checked stav z localStorage
    const storageKey = `shopping-checked-${weekStart}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const checkedNames: string[] = JSON.parse(saved);
        for (const item of result) {
          if (checkedNames.includes(item.name)) {
            item.checked = true;
          }
        }
      }
    } catch {}

    setItems(result);
    setError(null);
    setLoading(false);
  }

  function toggleItem(index: number) {
    setItems((prev) => {
      const updated = prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      );
      // Persistuj checked stav do localStorage
      const storageKey = `shopping-checked-${weekStart}`;
      try {
        const checkedNames = updated.filter((i) => i.checked).map((i) => i.name);
        localStorage.setItem(storageKey, JSON.stringify(checkedNames));
      } catch {}
      return updated;
    });
  }

  if (loading) {
    return <p className="text-gray-400">Načítám...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
        <p>{error}</p>
        <button onClick={fetchShoppingList} className="mt-2 text-sm underline text-red-400">
          Zkusit znovu
        </button>
      </div>
    );
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Nákupní seznam</h1>
          <p className="text-sm text-gray-500">Týden od {weekStart}</p>
        </div>
        {items.length > 0 && (
          <span className="text-sm text-gray-500">
            {checkedCount}/{items.length} hotovo
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Nákupní seznam je prázdný</p>
          <p className="text-sm">
            Přidej suroviny k jídlům v{" "}
            <a href="/jidla" className="underline text-gray-300">
              katalogu
            </a>{" "}
            a{" "}
            <a href="/plan" className="underline text-gray-300">
              vygeneruj plán
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, index) => (
            <button
              key={`${item.name}-${item.unit}`}
              onClick={() => toggleItem(index)}
              className="w-full bg-[#111] rounded-lg border border-gray-800 px-4 py-3 flex items-center gap-3 text-left hover:border-gray-700 transition-colors"
            >
              <span
                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                  item.checked
                    ? "bg-white border-white text-black"
                    : "border-gray-600"
                }`}
              >
                {item.checked && "✓"}
              </span>
              <span
                className={`flex-1 ${
                  item.checked ? "line-through text-gray-600" : "text-gray-200"
                }`}
              >
                {item.name}
              </span>
              {item.totalAmount != null && (
                <span
                  className={`text-sm shrink-0 ${
                    item.checked ? "text-gray-700" : "text-gray-500"
                  }`}
                >
                  {item.totalAmount}{item.unit ? ` ${item.unit}` : ""}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
