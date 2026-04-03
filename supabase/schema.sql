-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'viewer' check (role in ('lead_coach', 'viewer')),
  approved boolean not null default false,
  created_at timestamptz default now()
);

-- Year groups table
create table public.year_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Pitch fees table
create table public.pitch_fees (
  id uuid primary key default uuid_generate_v4(),
  year_group_id uuid references public.year_groups on delete cascade not null,
  amount numeric(10,2) not null check (amount > 0),
  fee_date date not null,
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.year_groups enable row level security;
alter table public.pitch_fees enable row level security;

-- Profiles: users can read all, only update their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Year groups: all authenticated can read; only lead_coach can write
create policy "Year groups viewable by authenticated users"
  on public.year_groups for select to authenticated using (true);

create policy "Lead coaches can insert year groups"
  on public.year_groups for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = 'lead_coach');

create policy "Lead coaches can update year groups"
  on public.year_groups for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'lead_coach');

create policy "Lead coaches can delete year groups"
  on public.year_groups for delete to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'lead_coach');

-- Pitch fees: same pattern
create policy "Pitch fees viewable by authenticated users"
  on public.pitch_fees for select to authenticated using (true);

create policy "Lead coaches can insert pitch fees"
  on public.pitch_fees for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = 'lead_coach');

create policy "Lead coaches can update pitch fees"
  on public.pitch_fees for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'lead_coach');

create policy "Lead coaches can delete pitch fees"
  on public.pitch_fees for delete to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'lead_coach');

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, approved)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    'viewer', 
    false
  );
  return new;
exception when others then
  raise log 'Error creating profile for user %: %', new.id, SQLERROR_MESSAGE;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
