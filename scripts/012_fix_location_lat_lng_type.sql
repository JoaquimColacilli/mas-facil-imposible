-- ============================================================
-- Migration 012: Fix location_lat / location_lng column types
-- ============================================================
-- NUMERIC se serializa como string en supabase-js (para preservar precisión
-- arbitraria). Para lat/lng no hace falta: DOUBLE PRECISION (float8) tiene
-- ~15-17 dígitos decimales, sobra para GPS civil, y se serializa como JS number.
--
-- Sin este cambio, el widget del topbar hace `typeof location_lat === 'number'`
-- y falla porque recibe "-34.603722" (string), mostrando "Configurá tu zona"
-- incluso con ubicación guardada.
--
-- USING cast convierte los valores existentes. Sin pérdida de precisión
-- dentro del rango válido de coordenadas GPS (±90 lat, ±180 lng).

ALTER TABLE public.profiles
  ALTER COLUMN location_lat TYPE DOUBLE PRECISION USING location_lat::DOUBLE PRECISION,
  ALTER COLUMN location_lng TYPE DOUBLE PRECISION USING location_lng::DOUBLE PRECISION;
