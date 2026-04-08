create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high');
  end if;
end
$$;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.columns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority public.task_priority not null default 'medium',
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.swimlanes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  criteria_type text not null check (criteria_type in ('priority', 'column', 'dueStatus')),
  criteria_value text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_boards_owner_created on public.boards(owner_id, created_at desc);
create index if not exists idx_columns_board_position on public.columns(board_id, position);
create index if not exists idx_columns_owner_board on public.columns(owner_id, board_id);
create index if not exists idx_tasks_board_column_position on public.tasks(board_id, column_id, position);
create index if not exists idx_tasks_owner_board on public.tasks(owner_id, board_id);
create index if not exists idx_swimlanes_owner_board on public.swimlanes(owner_id, board_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_boards_set_updated_at on public.boards;
create trigger trg_boards_set_updated_at
before update on public.boards
for each row
execute function public.set_updated_at();

drop trigger if exists trg_columns_set_updated_at on public.columns;
create trigger trg_columns_set_updated_at
before update on public.columns
for each row
execute function public.set_updated_at();

drop trigger if exists trg_tasks_set_updated_at on public.tasks;
create trigger trg_tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

drop trigger if exists trg_swimlanes_set_updated_at on public.swimlanes;
create trigger trg_swimlanes_set_updated_at
before update on public.swimlanes
for each row
execute function public.set_updated_at();

alter table public.boards enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.swimlanes enable row level security;

drop policy if exists "boards_owner_policy" on public.boards;
create policy "boards_owner_policy" on public.boards
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "columns_owner_policy" on public.columns;
create policy "columns_owner_policy" on public.columns
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "tasks_owner_policy" on public.tasks;
create policy "tasks_owner_policy" on public.tasks
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "swimlanes_owner_policy" on public.swimlanes;
create policy "swimlanes_owner_policy" on public.swimlanes
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
