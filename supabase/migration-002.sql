-- ============================================================
-- Migration 002 — Budgeting overhaul
-- Run this in the Supabase SQL Editor on an EXISTING project that
-- already ran the original schema.sql. It is non-destructive: your
-- existing expenses and budget limits are migrated, not dropped.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 1. New: budget_categories (user-managed) ----------
create table if not exists budget_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  -- kind: fixed | variable | saving | investment
  kind       text not null default 'variable'
             check (kind in ('fixed', 'variable', 'saving', 'investment')),
  -- priority: must_have | optional
  priority   text not null default 'must_have'
             check (priority in ('must_have', 'optional')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- 2. New: monthly_budgets (planned amount per category per month) ----------
create table if not exists monthly_budgets (
  id             uuid primary key default gen_random_uuid(),
  month          date not null,  -- always the 1st of the month (IST)
  category_id    uuid not null references budget_categories(id) on delete cascade,
  planned_amount numeric not null default 0 check (planned_amount >= 0),
  created_at     timestamptz not null default now(),
  unique (month, category_id)
);
create index if not exists monthly_budgets_month_idx on monthly_budgets (month);

-- ---------- 3. New: incomes (earnings per month) ----------
create table if not exists incomes (
  id         uuid primary key default gen_random_uuid(),
  month      date not null,
  label      text,
  amount     numeric not null check (amount >= 0),
  spender    text,
  created_at timestamptz not null default now()
);
create index if not exists incomes_month_idx on incomes (month);

-- ---------- 4. expenses: add description column ----------
alter table expenses add column if not exists description text;

-- ---------- 5. Migrate old `budgets` table (if present) ----------
do $$
begin
  if to_regclass('public.budgets') is not null then
    -- categories
    insert into budget_categories (name, kind, priority)
    select category, 'variable', 'must_have'
    from budgets
    on conflict (name) do nothing;

    -- this month's planned amounts
    insert into monthly_budgets (month, category_id, planned_amount)
    select date_trunc('month', timezone('Asia/Kolkata', now()))::date,
           c.id, b.monthly_limit
    from budgets b
    join budget_categories c on c.name = b.category
    on conflict (month, category_id) do nothing;
  end if;
end $$;

-- ---------- 6. Seed sensible defaults (skipped if name already exists) ----------
insert into budget_categories (name, kind, priority, sort_order) values
  ('Rent',          'fixed',      'must_have', 10),
  ('Utilities',     'fixed',      'must_have', 20),
  ('EMI / Loan',    'fixed',      'must_have', 30),
  ('Groceries',     'variable',   'must_have', 40),
  ('Fuel',          'variable',   'must_have', 50),
  ('Transport',     'variable',   'must_have', 60),
  ('Health',        'variable',   'must_have', 70),
  ('Eating Out',    'variable',   'optional',  80),
  ('Shopping',      'variable',   'optional',  90),
  ('Entertainment', 'variable',   'optional',  100),
  ('Other',         'variable',   'optional',  110),
  ('Emergency Fund','saving',     'must_have', 120),
  ('Mutual Funds',  'investment', 'optional',  130)
on conflict (name) do nothing;

-- ---------- 7. Status function for any month ----------
create or replace function budget_status_for_month(p_month date)
returns table (
  category_id     uuid,
  category        text,
  kind            text,
  priority        text,
  sort_order      integer,
  planned         numeric,
  spent           numeric,
  percentage_used numeric
)
language sql
stable
as $$
  select
    c.id,
    c.name,
    c.kind,
    c.priority,
    c.sort_order,
    coalesce(mb.planned_amount, 0) as planned,
    coalesce(e.spent, 0)           as spent,
    case
      when coalesce(mb.planned_amount, 0) > 0
        then round(coalesce(e.spent, 0) / mb.planned_amount * 100, 1)
      else 0
    end                            as percentage_used
  from budget_categories c
  left join monthly_budgets mb
    on mb.category_id = c.id and mb.month = p_month
  left join (
    select category, sum(amount) as spent
    from expenses
    where date >= timezone('Asia/Kolkata', p_month::timestamp)
      and date <  timezone('Asia/Kolkata', (p_month + interval '1 month')::timestamp)
    group by category
  ) e on e.category = c.name
  order by c.sort_order, c.name;
$$;

-- ---------- 8. RLS: deny anon on new tables (service role bypasses) ----------
alter table budget_categories enable row level security;
alter table monthly_budgets   enable row level security;
alter table incomes           enable row level security;

-- ---------- 9. Clean up the old budgets view + table ----------
drop view if exists budget_status;
drop table if exists budgets;
