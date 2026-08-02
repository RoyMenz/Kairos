-- Supabase Database Table Schema for Kairos Employee Onboarding System
-- Run this script in your Supabase SQL Editor

-- 1. Create employees table in public schema
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  personal_email TEXT,
  work_email TEXT,
  designation TEXT,
  role TEXT NOT NULL,
  department TEXT DEFAULT 'Engineering',
  joining_date TEXT,
  initials TEXT,
  status TEXT DEFAULT 'Provisioning',
  zoho_zuid TEXT,
  zoho_account_id TEXT,
  slack_user_id TEXT,
  slack_channel_id TEXT,
  github_invitation_id TEXT,
  github_username TEXT,
  jira_account_id TEXT,
  platform_status JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  offboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS personal_email TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS work_email TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS zoho_zuid TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS zoho_account_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS github_invitation_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS github_username TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS jira_account_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS platform_status JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS offboarded_at TIMESTAMPTZ;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy allowing API operations
DROP POLICY IF EXISTS "Allow all operations for employees" ON public.employees;
CREATE POLICY "Allow all operations for employees"
ON public.employees
FOR ALL
USING (true)
WITH CHECK (true);
