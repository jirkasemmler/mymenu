"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Meal, MealIngredient, SUGGESTED_TAGS } from "@/lib/types";

const supabase = createClient();

export default function JidlaPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Stav pro správu surovin
  const [ingredientsMealId, setIngredientsMealId] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [ingName, setIngName] = useState("");
  const [ingAmount, setIngAmount] = useState("");
  const [ingUnit, setIngUnit] = useState("");
  const [ingSubmitting, setIngSubmitting] = useState(false);

  useEffect(() => {
    fetchMeals();
  }, []);

  async function fetchMeals() {
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Chyba při načítání jídel:", error);
      setError("Nepodařilo se načíst jídla. Zkontroluj připojení k Supabase.");
    } else {
      setMeals(data || []);
      setError(null);
    }
    setLoading(false);
  }

  function resetForm() {
    setName("");
    setDescription("");
    setSelectedTags([]);
    setEditingMeal(null);
    setShowForm(false);
  }

  function startEdit(meal: Meal) {
    setEditingMeal(meal);
    setName(meal.name);
    setDescription(meal.description || "");
    setSelectedTags(meal.tags);
    setShowForm(true);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);

    if (editingMeal) {
      const { error } = await supabase
        .from("meals")
        .update({ name: name.trim(), description: description.trim() || null, tags: selectedTags })
        .eq("id", editingMeal.id);
      if (error) {
        console.error("Chyba při úpravě jídla:", error);
        alert("Nepodařilo se uložit změny.");
        setSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("meals")
        .insert({ name: name.trim(), description: description.trim() || null, tags: selectedTags });
      if (error) {
        console.error("Chyba při přidávání jídla:", error);
        alert("Nepodařilo se přidat jídlo.");
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    resetForm();
    fetchMeals();
  }

  async function handleDelete(id: number) {
    if (!confirm("Smazat jídlo?")) return;
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) {
      console.error("Chyba při mazání jídla:", error);
      alert("Nepodařilo se smazat jídlo.");
      return;
    }
    fetchMeals();
  }

  async function openIngredients(mealId: number) {
    if (ingredientsMealId === mealId) {
      setIngredientsMealId(null);
      setIngredients([]);
      return;
    }
    // Reset formuláře surovin při přepnutí na jiné jídlo
    setIngName("");
    setIngAmount("");
    setIngUnit("");
    setIngredientsMealId(mealId);
    const { data, error } = await supabase
      .from("meal_ingredients")
      .select("*")
      .eq("meal_id", mealId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Chyba při načítání surovin:", error);
      setIngredients([]);
    } else {
      setIngredients(data || []);
    }
  }

  async function addIngredient(mealId: number) {
    if (!ingName.trim() || ingSubmitting) return;
    setIngSubmitting(true);
    const parsedAmount = ingAmount ? parseFloat(ingAmount) : null;
    const safeAmount = parsedAmount !== null && isNaN(parsedAmount) ? null : parsedAmount;
    const { data: inserted, error } = await supabase.from("meal_ingredients").insert({
      meal_id: mealId,
      name: ingName.trim(),
      amount: safeAmount,
      unit: ingUnit.trim() || null,
    }).select().single();
    if (error) {
      console.error("Chyba při přidávání suroviny:", error);
      alert("Nepodařilo se přidat surovinu.");
    } else {
      setIngName("");
      setIngAmount("");
      setIngUnit("");
      // Appendni vloženou surovinu do stavu místo druhého fetche
      if (inserted) {
        setIngredients((prev) => [...prev, inserted]);
      }
    }
    setIngSubmitting(false);
  }

  async function deleteIngredient(mealId: number, ingredientId: number) {
    const { error } = await supabase.from("meal_ingredients").delete().eq("id", ingredientId);
    if (error) {
      console.error("Chyba při mazání suroviny:", error);
      return;
    }
    setIngredients((prev) => prev.filter((i) => i.id !== ingredientId));
  }

  if (loading) {
    return <p className="text-gray-400">Načítám...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
        <p>{error}</p>
        <button onClick={fetchMeals} className="mt-2 text-sm underline text-red-400">
          Zkusit znovu
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Katalog jídel</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            + Přidat jídlo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#111] rounded-lg border border-gray-800 p-4 mb-6">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-300 mb-1">Název</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Např. Špagety bolognese"
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-300 mb-1">Popis (volitelné)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Krátký popis..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Tagy</label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-white text-black"
                      : "bg-[#222] text-gray-400 hover:bg-[#333]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Ukládám..." : editingMeal ? "Uložit" : "Přidat"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="px-4 py-2 bg-[#222] text-gray-400 rounded-lg text-sm hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {meals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Zatím nemáš žádná jídla</p>
          <p className="text-sm">Přidej jídla, která umíte vařit, a pak vygeneruj týdenní plán.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-[#111] rounded-lg border border-gray-800 p-4 flex flex-wrap items-center justify-between"
            >
              <div className="min-w-0">
                <div className="font-medium text-white">{meal.name}</div>
                {meal.description && (
                  <div className="text-sm text-gray-400">{meal.description}</div>
                )}
                {meal.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {meal.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[#222] text-gray-400 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button
                  onClick={() => openIngredients(meal.id)}
                  className="text-sm text-gray-500 hover:text-gray-300"
                  title="Suroviny"
                >
                  🥕
                </button>
                <button
                  onClick={() => startEdit(meal)}
                  className="text-sm text-gray-500 hover:text-gray-300"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(meal.id)}
                  className="text-sm text-gray-500 hover:text-red-400"
                >
                  🗑️
                </button>
              </div>

              {/* Správa surovin */}
              {ingredientsMealId === meal.id && (
                <div className="w-full mt-3 pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2">Suroviny</p>
                  {ingredients.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {ingredients.map((ing) => (
                        <div key={ing.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">
                            {ing.name}
                            {ing.amount != null && (
                              <span className="text-gray-500 ml-1">
                                {ing.amount}{ing.unit ? ` ${ing.unit}` : ""}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => deleteIngredient(meal.id, ing.id)}
                            className="text-xs text-gray-600 hover:text-red-400"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ingName}
                      onChange={(e) => setIngName(e.target.value)}
                      placeholder="Surovina"
                      className="flex-1 min-w-0 px-2 py-1 bg-[#1a1a1a] border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                    <input
                      type="number"
                      value={ingAmount}
                      onChange={(e) => setIngAmount(e.target.value)}
                      placeholder="Množství"
                      className="w-20 px-2 py-1 bg-[#1a1a1a] border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                    <input
                      type="text"
                      value={ingUnit}
                      onChange={(e) => setIngUnit(e.target.value)}
                      placeholder="Jednotka"
                      className="w-20 px-2 py-1 bg-[#1a1a1a] border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                    <button
                      onClick={() => addIngredient(meal.id)}
                      disabled={ingSubmitting || !ingName.trim()}
                      className="px-3 py-1 bg-white text-black rounded text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ingSubmitting ? "..." : "+"}
                    </button>
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
