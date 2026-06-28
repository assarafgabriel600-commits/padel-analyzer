-- Brev App — Supabase schema
-- Run this in the Supabase SQL editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Exercises ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_site     TEXT NOT NULL,           -- 'strabon' | 'eduscol' | 'education_gouv'
    source_url      TEXT NOT NULL,           -- URL of the source PDF
    pdf_path        TEXT,                    -- Local or S3 path to the source PDF
    year            INTEGER,
    session_code    TEXT,                    -- 'metropole' | 'polynesie' | 'antilles' etc.
    subject         TEXT NOT NULL,           -- 'histoire_geo_emc' | 'maths' | 'francais' | 'sciences'
    theme           TEXT,                    -- Official programme theme
    sub_theme       TEXT,
    exercise_type   TEXT,                    -- 'developpement_construit' | 'etude_documents' | 'calcul' etc.
    difficulty      INTEGER DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
    points          INTEGER,
    page_start      INTEGER DEFAULT 0,
    page_end        INTEGER DEFAULT 0,
    text_content    TEXT,                    -- Extracted text (up to 10k chars)
    images          JSONB DEFAULT '[]',      -- Array of image paths
    classified_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS exercises_source_page_idx
    ON exercises (source_url, page_start);

-- Indexes for search
CREATE INDEX IF NOT EXISTS exercises_subject_idx ON exercises (subject);
CREATE INDEX IF NOT EXISTS exercises_theme_idx ON exercises (theme);
CREATE INDEX IF NOT EXISTS exercises_exercise_type_idx ON exercises (exercise_type);
CREATE INDEX IF NOT EXISTS exercises_year_idx ON exercises (year);
CREATE INDEX IF NOT EXISTS exercises_text_search_idx ON exercises USING gin(to_tsvector('french', COALESCE(text_content, '')));

-- ── Generated Subjects ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_subjects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    pdf_url         TEXT,                    -- Signed or public URL of the generated PDF
    pdf_path        TEXT,                    -- S3 key
    exercise_ids    UUID[] DEFAULT '{}',
    user_prompt     TEXT,                    -- The user's original request
    subjects        TEXT[] DEFAULT '{}',     -- Subjects covered
    themes          TEXT[] DEFAULT '{}',     -- Themes covered
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS generated_subjects_user_idx ON generated_subjects (user_id);
CREATE INDEX IF NOT EXISTS generated_subjects_created_idx ON generated_subjects (created_at DESC);

-- ── Row-Level Security ────────────────────────────────────────────────────────

-- Exercises: readable by all authenticated users, writable only by service role
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises_read" ON exercises FOR SELECT USING (auth.role() = 'authenticated');

-- Generated subjects: only owner can read/delete
ALTER TABLE generated_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_own" ON generated_subjects
    FOR ALL USING (auth.uid() = user_id);

-- ── Seed data (optional, for testing) ────────────────────────────────────────
-- INSERT INTO exercises (source_site, source_url, year, subject, theme, exercise_type, difficulty, points, text_content)
-- VALUES (
--   'strabon',
--   'https://histoire.ac-versailles.fr/IMG/pdf/23genhgemcag1.pdf',
--   2023,
--   'histoire_geo_emc',
--   'La Guerre froide',
--   'developpement_construit',
--   2,
--   10,
--   'Développement construit : La Guerre froide (1947-1991)...'
-- );
