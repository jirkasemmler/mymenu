-- Suroviny ke každému jídlu
-- Spusť v Supabase SQL Editoru (DEV projekt)

CREATE TABLE meal_ingredients (
  id integer generated always as identity primary key,
  meal_id integer not null references meals(id) on delete cascade,
  name text not null,
  amount numeric,
  unit text,
  created_at timestamptz not null default now()
);

ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_ingredients_allow_all" ON meal_ingredients FOR ALL USING (true) WITH CHECK (true);
