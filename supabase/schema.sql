-- FinSight AI Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  avatar_url text,
  currency text default 'INR',
  monthly_income numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transactions
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Budgets
create table if not exists public.budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  monthly_limit numeric(12,2) not null,
  month text not null, -- format: YYYY-MM
  created_at timestamptz default now(),
  unique(user_id, category, month)
);

-- Savings Goals
create table if not exists public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) default 0,
  target_date date,
  icon text default '🎯',
  created_at timestamptz default now()
);

-- Debts
create table if not exists public.debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text default 'loan' check (type in ('loan', 'credit_card', 'other')),
  principal numeric(12,2) not null,
  outstanding numeric(12,2) not null,
  interest_rate numeric(5,2) not null,
  emi numeric(12,2),
  due_date int, -- day of month
  created_at timestamptz default now()
);

-- Invoices
create table if not exists public.invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  invoice_number text not null,
  client_name text not null,
  client_email text,
  client_address text,
  items jsonb not null default '[]',
  gst_rate numeric(5,2) default 0,
  subtotal numeric(12,2) not null,
  gst_amount numeric(12,2) default 0,
  total numeric(12,2) not null,
  status text default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  issue_date date default current_date,
  due_date date,
  notes text,
  created_at timestamptz default now()
);

-- Bills / Recurring expenses
create table if not exists public.bills (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric(12,2) not null,
  due_day int not null check (due_day between 1 and 31),
  category text not null,
  is_paid boolean default false,
  autopay boolean default false,
  created_at timestamptz default now()
);

-- Portfolio holdings
create table if not exists public.holdings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  type text default 'stock' check (type in ('stock', 'mutual_fund', 'etf', 'crypto')),
  quantity numeric(15,4) not null,
  buy_price numeric(12,4) not null,
  created_at timestamptz default now()
);

-- AI insight cache
create table if not exists public.ai_cache (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  cache_key text not null,
  response text not null,
  created_at timestamptz default now(),
  unique(user_id, cache_key)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.debts enable row level security;
alter table public.invoices enable row level security;
alter table public.bills enable row level security;
alter table public.holdings enable row level security;
alter table public.ai_cache enable row level security;

-- RLS Policies (users can only access their own data)
create policy "Users own their profile" on public.profiles for all using (auth.uid() = id);
create policy "Users own transactions" on public.transactions for all using (auth.uid() = user_id);
create policy "Users own budgets" on public.budgets for all using (auth.uid() = user_id);
create policy "Users own goals" on public.goals for all using (auth.uid() = user_id);
create policy "Users own debts" on public.debts for all using (auth.uid() = user_id);
create policy "Users own invoices" on public.invoices for all using (auth.uid() = user_id);
create policy "Users own bills" on public.bills for all using (auth.uid() = user_id);
create policy "Users own holdings" on public.holdings for all using (auth.uid() = user_id);
create policy "Users own ai_cache" on public.ai_cache for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- News table for persistent finance news
create table if not exists public.news (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  url text unique not null,
  source text,
  image text,
  category text default 'finance',
  published_at timestamptz not null,
  created_at timestamptz default now()
);

-- Enable RLS and public read access
alter table public.news enable row level security;
create policy "Anyone can read news" on public.news for select using (true);

-- Index for fast sorting by date
create index if not exists idx_news_published_at on public.news (published_at desc);
