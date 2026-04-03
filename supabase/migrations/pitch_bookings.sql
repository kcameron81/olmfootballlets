-- Pitch bookings table: scheduled pitch usage per year group
create table public.pitch_bookings (
  id uuid primary key default uuid_generate_v4(),
  year_group_id uuid references public.year_groups on delete cascade not null,
  booking_date date not null,
  pitch_name text not null,
  start_time text,
  end_time text,
  notes text,
  created_at timestamptz default now()
);

alter table public.pitch_bookings enable row level security;

create policy "Pitch bookings viewable by authenticated users"
  on public.pitch_bookings for select to authenticated using (true);

create policy "Lead coaches can insert pitch bookings"
  on public.pitch_bookings for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = 'lead_coach');

create policy "Lead coaches can update pitch bookings"
  on public.pitch_bookings for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'lead_coach');

create policy "Lead coaches can delete pitch bookings"
  on public.pitch_bookings for delete to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'lead_coach');
