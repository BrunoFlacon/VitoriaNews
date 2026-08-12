-- ============================================================
-- Social Canvas Hub — Setup do Banco Local
-- Cria stubs do Supabase Auth + aplica migrations
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SCHEMA: auth (stubs para compatibilidade com migrations)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS auth;

-- Tipos do Supabase Auth
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'key_status') THEN
    CREATE TYPE auth.key_status AS ENUM ('default', 'valid', 'invalid', 'expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'key_type') THEN
    CREATE TYPE auth.key_type AS ENUM ('aead-ietf', 'aead-det', 'hmacsha512', 'hmacsha256', 'auth', 'shorthash', 'generichash', 'kdf', 'secretbox', 'secretstream', 'stream_xchacha20');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'factor_type') THEN
    CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'factor_status') THEN
    CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aal_level') THEN
    CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'code_challenge_method') THEN
    CREATE TYPE auth.code_challenge_method AS ENUM ('s256', 'plain');
  END IF;
END $$;

-- Tabela auth.users (versão simplificada)
CREATE TABLE IF NOT EXISTS auth.users (
    instance_id uuid,
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    aud varchar(255),
    role varchar(255),
    email varchar(255),
    encrypted_password varchar(255),
    email_confirmed_at timestamptz,
    invited_at timestamptz,
    confirmation_token varchar(255),
    confirmation_sent_at timestamptz,
    recovery_token varchar(255),
    recovery_sent_at timestamptz,
    email_change_token_new varchar(255),
    email_change varchar(255),
    email_change_sent_at timestamptz,
    last_sign_in_at timestamptz,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamptz,
    updated_at timestamptz,
    phone varchar(255),
    phone_confirmed_at timestamptz,
    phone_change varchar(255),
    phone_change_token varchar(255),
    phone_change_sent_at timestamptz,
    email_change_token_current varchar(255),
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamptz,
    reauthentication_token varchar(255),
    reauthentication_sent_at timestamptz,
    is_sso_user boolean DEFAULT false,
    deleted_at timestamptz,
    is_anonymous boolean DEFAULT false
);

-- Funções stubs do Auth
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$ SELECT COALESCE(current_setting('app.user_id', true), '00000000-0000-0000-0000-000000000000')::uuid; $$;

CREATE OR REPLACE FUNCTION auth.users()
RETURNS SETOF auth.users
LANGUAGE sql
STABLE
AS $$ SELECT * FROM auth.users; $$;

-- Função auth.is_authenticated()
CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$ SELECT current_setting('app.user_id', true) IS NOT NULL; $$;

-- Função auth.role()
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT COALESCE(current_setting('app.user_role', true), 'authenticated'); $$;

-- ============================================================
-- SCHEMA: storage (stubs)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    owner uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text REFERENCES storage.buckets(id),
    name text,
    owner uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_accessed_at timestamptz DEFAULT now(),
    metadata jsonb,
    path_tokens text[],
    version text,
    owner_id text
);

-- Funções de storage
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql
AS $$ BEGIN RETURN trim_array(string_to_array(name, '/'), 1); END $$;

CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text
LANGUAGE plpgsql
AS $$ BEGIN RETURN (string_to_array(name, '/'))[array_length(string_to_array(name, '/'),1)]; END $$;

-- ============================================================
-- SCHEMA: realtime (stub para publications)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS realtime;

-- ============================================================
-- SCHEMA: extensions (stub)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS extensions;

-- ============================================================
-- Configurações do Supabase
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supabase_settings (
    id SERIAL PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value text
);
