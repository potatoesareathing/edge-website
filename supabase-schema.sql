-- ============================================================================
-- EDGE — REGISTRATIONS TABLE
-- ----------------------------------------------------------------------------
-- Run this once:  Supabase dashboard -> SQL Editor -> New query -> Run.
--
-- Then paste your project URL and anon key into
--   js/content.js  ->  join.backend.supabase
--
-- READ SECTION 3 BEFORE THE SITE GOES PUBLIC. It is the part that stops
-- strangers downloading every student's phone number.
-- ============================================================================


-- == 1. THE TABLE ============================================================
-- One table holds both paths. Member rows simply leave the competitive
-- columns null. Keeping them together means the leaderboard and rosters can
-- later join against a single list of people rather than two.

create table if not exists public.registrations (
  id               uuid primary key default gen_random_uuid(),

  -- which path they chose
  path             text        not null check (path in ('member','roster')),

  -- asked of everyone
  full_name        text        not null,
  register_number  text        not null,
  branch           text        not null,
  year             text        not null,
  phone            text        not null,
  email            text        not null,

  -- member path only
  interests        text[]      default '{}',

  -- roster path only (null for members)
  game             text,
  ign              text,
  rank             text,
  role             text,
  experience       text,

  submitted_at     timestamptz,
  created_at       timestamptz default now()
);

-- One registration per student. The form turns the resulting 409 into a
-- friendly "you have already signed up" message instead of a raw error.
create unique index if not exists registrations_register_number_key
  on public.registrations (upper(register_number));

create index if not exists registrations_created_at_idx
  on public.registrations (created_at desc);

create index if not exists registrations_path_idx
  on public.registrations (path);


-- == 2. VALIDATION ===========================================================
-- The browser already checks these, but anyone can POST straight at the API,
-- so the database enforces the same shape. Client-side validation is for the
-- person filling the form in; these constraints are the actual guarantee.

alter table public.registrations drop constraint if exists registrations_phone_check;
alter table public.registrations add  constraint registrations_phone_check
  check (phone ~ '^[6-9][0-9]{9}$');

alter table public.registrations drop constraint if exists registrations_email_check;
alter table public.registrations add  constraint registrations_email_check
  check (position('@' in email) > 1 and email like '%_.__%');

-- A roster application without a game or an in-game name is incomplete.
alter table public.registrations drop constraint if exists registrations_roster_check;
alter table public.registrations add  constraint registrations_roster_check
  check (
    path = 'member'
    or (game is not null and ign is not null and length(trim(ign)) > 0)
  );


-- == 3. SECURITY — THE IMPORTANT PART ========================================
-- Supabase publishes every table over a public REST API, and the anon key
-- sitting in js/content.js is visible to anyone who views source. That key is
-- MEANT to be public. Row Level Security is what actually protects the data.
--
-- Without the policy below, ANYONE COULD DOWNLOAD EVERY STUDENT'S NAME,
-- PHONE NUMBER AND EMAIL using the key taken from your own page.
--
-- The rule we want: the public may INSERT and may do nothing else.
-- No select policy is created, so reads are denied by default. Committee
-- members read the data while signed in to the Supabase dashboard, which
-- runs as the service role and bypasses RLS.

alter table public.registrations enable row level security;

drop policy if exists "public can register" on public.registrations;
create policy "public can register"
  on public.registrations
  for insert
  to anon
  with check (true);

-- Deliberately NOT created:
--   * a select policy  (nobody can read rows through the public API)
--   * an update policy (nobody can alter a submission afterwards)
--   * a delete policy  (nobody can wipe your registrations)


-- == 4. CHECK IT WORKED ======================================================
-- Replace the two placeholders and run both from a terminal.
--
-- (a) This INSERT should SUCCEED:
--
--   curl -X POST 'https://YOUR-PROJECT.supabase.co/rest/v1/registrations' \
--     -H "apikey: YOUR_ANON_KEY" \
--     -H "Authorization: Bearer YOUR_ANON_KEY" \
--     -H "Content-Type: application/json" \
--     -d '{"path":"member","full_name":"Test","register_number":"TEST001",
--          "branch":"Other","year":"1st Year","phone":"9876543210",
--          "email":"test@example.com"}'
--
-- (b) This SELECT MUST come back as an empty list [].
--     If it returns rows, RLS is not protecting you — fix that before launch:
--
--   curl 'https://YOUR-PROJECT.supabase.co/rest/v1/registrations?select=*' \
--     -H "apikey: YOUR_ANON_KEY" \
--     -H "Authorization: Bearer YOUR_ANON_KEY"
--
-- Delete the test row from the dashboard afterwards.
