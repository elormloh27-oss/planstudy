-- PlanStudy schema: one table, tasks stored as JSONB.
-- Run this once in Supabase dashboard > SQL editor > New query > Run.

create table if not exists study_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  subject text not null,
  topics text not null,
  deadline date not null,
  hours_per_day int not null check (hours_per_day between 1 and 12),
  plan_json jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table study_plans enable row level security;

revoke all on table study_plans from anon, authenticated;
grant select, insert, update, delete on table study_plans to authenticated;

drop policy if exists "own select" on study_plans;
drop policy if exists "own insert" on study_plans;
drop policy if exists "own update" on study_plans;
drop policy if exists "own delete" on study_plans;

create policy "own select" on study_plans
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own insert" on study_plans
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own update" on study_plans
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own delete" on study_plans
  for delete to authenticated
  using ((select auth.uid()) = user_id);
