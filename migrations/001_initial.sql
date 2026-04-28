-- Spusť v Supabase SQL Editoru (DEV projekt)
-- Až budeš deployovat, stejný SQL spustíš i v PROD projektu

CREATE TABLE meals (
  id integer generated always as identity primary key,
  name text not null,
  description text,
  tags text[] not null default '{}',
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meals_allow_all" ON meals FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE meal_plans (
  id integer generated always as identity primary key,
  week_start date not null,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plans_allow_all" ON meal_plans FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE meal_plan_items (
  id integer generated always as identity primary key,
  meal_plan_id integer not null references meal_plans(id) on delete cascade,
  meal_id integer not null references meals(id) on delete cascade,
  day integer not null check (day >= 0 and day <= 6),
  meal_type text not null check (meal_type in ('oběd', 'večeře')),
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plan_items_allow_all" ON meal_plan_items FOR ALL USING (true) WITH CHECK (true);
