"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Meal, SUGGESTED_TAGS } from "@/lib/types";

export default function JidlaPage() {
  const supabase = createClient();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetchMeals();
  }, []);

  async function fetchMeals() {
    const { data } = await supabase
      .from("meals")
      .select("*")
      .order("created_at", { ascending: false });
    setMeals(data || []);
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
    if (!name.trim()) return;

    if (editingMeal) {
      await supabase
        .from("meals")
        .update({ name: name.trim(), description: description.trim() || null, tags: selectedTags })
        .eq("id", editingMeal.id);
    } else {
      await supabase
        .from("meals")
        .insert({ name: name.trim(), description: description.trim() || null, tags: selectedTags });
    }

    resetForm();
    fetchMeals();
  }

  async function handleDelete(id: number) {
    if (!confirm("Smazat jídlo?")) return;
    await supabase.from("meals").delete().eq("id", id);
    fetchMeals();
  }

  if (loading) {
    return <p className="text-gray-500">Načítám...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Katalog jídel</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            + Přidat jídlo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Název</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Např. Špagety bolognese"
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Popis (volitelné)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Krátký popis..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tagy</label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              {editingMeal ? "Uložit" : "Přidat"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
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
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">{meal.name}</div>
                {meal.description && (
                  <div className="text-sm text-gray-500">{meal.description}</div>
                )}
                {meal.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {meal.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button
                  onClick={() => startEdit(meal)}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(meal.id)}
                  className="text-sm text-gray-400 hover:text-red-500"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
