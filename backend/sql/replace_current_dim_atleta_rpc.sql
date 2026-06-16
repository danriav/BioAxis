-- Atomic SCD2 replacement for the real Supabase dim_atleta table.
-- This script is intentionally separate from schema.sql because dim_atleta is a
-- legacy Supabase table used by the mobile/profile API, not part of the current
-- SQLAlchemy metadata contract.

CREATE OR REPLACE FUNCTION public.replace_current_dim_atleta(
  p_user_id uuid,
  p_profile jsonb
)
RETURNS public.dim_atleta
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new public.dim_atleta;
  v_current_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '23502';
  END IF;

  -- Serialize replacements for the same athlete inside the transaction.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  UPDATE public.dim_atleta
  SET
    is_current = false,
    valid_to = now()
  WHERE user_id = p_user_id
    AND is_current = true;

  INSERT INTO public.dim_atleta (
    user_id,
    genero,
    edad,
    peso,
    altura,
    hombros,
    pecho,
    brazo,
    antebrazo,
    cintura,
    cadera,
    gluteo,
    pierna,
    pantorrilla,
    objetivo_metabolico,
    dias_entrenamiento_semana,
    valid_from,
    valid_to,
    is_current
  )
  VALUES (
    p_user_id,
    p_profile->>'genero',
    NULLIF(p_profile->>'edad', '')::integer,
    NULLIF(p_profile->>'peso', '')::double precision,
    NULLIF(p_profile->>'altura', '')::double precision,
    NULLIF(p_profile->>'hombros', '')::double precision,
    NULLIF(p_profile->>'pecho', '')::double precision,
    NULLIF(p_profile->>'brazo', '')::double precision,
    NULLIF(p_profile->>'antebrazo', '')::double precision,
    NULLIF(p_profile->>'cintura', '')::double precision,
    NULLIF(p_profile->>'cadera', '')::double precision,
    NULLIF(p_profile->>'gluteo', '')::double precision,
    NULLIF(p_profile->>'pierna', '')::double precision,
    NULLIF(p_profile->>'pantorrilla', '')::double precision,
    COALESCE(NULLIF(p_profile->>'objetivo_metabolico', ''), 'mantenimiento'),
    COALESCE(NULLIF(p_profile->>'dias_entrenamiento_semana', '')::integer, 3),
    now(),
    NULL,
    true
  )
  RETURNING * INTO v_new;

  SELECT count(*)
  INTO v_current_count
  FROM public.dim_atleta
  WHERE user_id = p_user_id
    AND is_current = true;

  IF v_current_count <> 1 OR v_new.is_current IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'replace_current_dim_atleta invariant failed'
      USING ERRCODE = '23514';
  END IF;

  RETURN v_new;
END;
$$;

COMMENT ON FUNCTION public.replace_current_dim_atleta(uuid, jsonb)
IS 'Atomically closes current dim_atleta rows and inserts exactly one new current SCD2 biometric row for a user.';

REVOKE ALL ON FUNCTION public.replace_current_dim_atleta(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_current_dim_atleta(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.replace_current_dim_atleta(uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_current_dim_atleta(uuid, jsonb) TO service_role;
