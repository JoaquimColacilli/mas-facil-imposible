-- ============================================================
-- Migration 011: Add user location fields to profiles
-- ============================================================
-- Para el widget de clima + hora en el topbar.
-- Todas NULL-ables: si cualquiera es NULL, el widget muestra un CTA
-- invitando al usuario a configurar su ubicación en /settings.
-- RLS ya está habilitado en public.profiles (migración 001) con policies
-- auth.uid() = id a nivel tabla — las columnas nuevas se heredan automáticamente.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_lat      NUMERIC(9, 6);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_lng      NUMERIC(9, 6);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_name     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_timezone TEXT;
