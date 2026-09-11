-- Supabase PostgreSQL Schema for TOMMY'S HOSPITAL

-- Drop existing tables if they exist (in reverse order of dependencies)
drop table if exists notifications;
drop table if exists doctor_patient_assignments;
drop table if exists medical_records;
drop table if exists appointments;
drop table if exists doctor_profiles;
drop table if exists profiles;

-- Create profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  address text,
  blood_group text,
  role text not null check (role in ('patient', 'doctor', 'admin')) default 'patient',
  avatar_url text,
  created_at timestamptz default now()
);

-- Enable RLS (Row Level Security) or keep it basic for now. Let's make sure it has public permissions or correct policy.
-- Note: For simplicity and dashboard usage, policies can be created, or RLS disabled if desired. Let's write standard tables.

-- Create doctor_profiles table
create table doctor_profiles (
  id uuid references profiles(id) on delete cascade primary key,
  specialty text not null,
  qualification text,
  years_experience int,
  bio text,
  available_days text[], -- e.g. ['Monday','Wednesday','Friday']
  consultation_fee numeric(10,2)
);

-- Create appointments table
create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references profiles(id) on delete cascade,
  doctor_id uuid references profiles(id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  department text not null,
  reason text,
  status text check (status in ('pending', 'confirmed', 'completed', 'cancelled')) default 'pending',
  notes text,
  is_acknowledged boolean default false,
  created_at timestamptz default now()
);


-- Create medical_records table
create table medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references profiles(id) on delete cascade,
  doctor_id uuid references profiles(id) on delete cascade,
  diagnosis text not null,
  symptoms text,
  prescription text,
  lab_results text,
  follow_up_date date,
  record_date date default current_date,
  created_at timestamptz default now()
);

-- Create doctor_patient_assignments table
create table doctor_patient_assignments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references profiles(id) on delete cascade,
  patient_id uuid references profiles(id) on delete cascade,
  diagnosis_context text,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz default now(),
  is_active boolean default true,
  unique(doctor_id, patient_id)
);

-- Create notifications table
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  message text not null,
  is_read boolean default false,
  type text check (type in ('appointment', 'assignment', 'record', 'general')),
  created_at timestamptz default now()
);

-- Setup trigger to auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', 'New Patient'), 
    new.email, 
    coalesce(new.raw_user_meta_data->>'role', 'patient')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
