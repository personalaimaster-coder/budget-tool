-- ============================================================
-- Family Budget — Supabase schema (fresh install)
-- Run this in the Supabase SQL Editor for a NEW project.
-- (If you already ran an older version, run supabase/migration-002.sql instead.)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Categories (user-managed buckets) ----------
create table if not exists budget_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  kind       text not null default 'variable'
             check (kind in ('fixed', 'variable', 'saving', 'investment')),
  priority   text not null default 'must_have'
             check (priority in ('must_have', 'optional')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Planned budget per category per month ----------
create table if not exists monthly_budgets (
  id             uuid primary key default gen_random_uuid(),
  month          date not null,  -- always the 1st of the month (IST)
  category_id    uuid not null references budget_categories(id) on delete cascade,
  planned_amount numeric not null default 0 check (planned_amount >= 0),
  created_at     timestamptz not null default now(),
  unique (month, category_id)
);
create index if not exists monthly_budgets_month_idx on monthly_budgets (month);

-- ---------- Income / earnings per month ----------
create table if not exists incomes (
  id         uuid primary key default gen_random_uuid(),
  month      date not null,
  label      text,
  amount     numeric not null check (amount >= 0),
  spender    text,
  created_at timestamptz not null default now()
);
create index if not exists incomes_month_idx on incomes (month);

-- ---------- Expenses / transactions (includes saving & investment contributions) ----------
create table if not exists expenses (
  id               uuid primary key default gen_random_uuid(),
  amount           numeric not null check (amount >= 0),
  category         text not null,            -- references budget_categories.name
  item_description text,                      -- short item name, e.g. "Ice cream"
  description      text,                      -- extra free-form details
  spender          text not null,
  date             timestamptz not null default now()
);
create index if not exists expenses_date_idx on expenses (date desc);
create index if not exists expenses_category_idx on expenses (category);

-- ---------- Budget status for any month (planned vs actual) ----------
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

-- ---------- Row Level Security (deny anon; service role bypasses) ----------
alter table budget_categories enable row level security;
alter table monthly_budgets   enable row level security;
alter table incomes           enable row level security;
alter table expenses          enable row level security;

-- ---------- Default categories ----------
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
