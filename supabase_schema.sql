-- Supabase Database Table Schema for Kairos Employee Onboarding System
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/bvauozoxzcfzytmyjnkp/sql)

-- 1. Create employees table in public schema
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  department TEXT DEFAULT 'Engineering',
  joining_date TEXT,
  initials TEXT,
  status TEXT DEFAULT 'Provisioning',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy allowing API operations
DROP POLICY IF EXISTS "Allow all operations for employees" ON public.employees;
CREATE POLICY "Allow all operations for employees"
ON public.employees
FOR ALL
USING (true)
WITH CHECK (true);
