# Supabase Database Introspection

Last reviewed: 2026-05-27.

This document records the real Supabase table shape provided for BioAxis
contract validation. It is descriptive only. Do not run this file as a
migration.

## Current Tables

### `public.catalog_foods`

Food catalog used by `GET /nutrition/search`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, defaults to `uuid_generate_v4()`. |
| `name_es` | `text` | Required display name. |
| `protein_per_g` | `double precision` | Numeric grams per gram. |
| `carbs_per_g` | `double precision` | Numeric grams per gram. |
| `fat_per_g` | `double precision` | Numeric grams per gram. |
| `fiber_per_g` | `double precision` | Numeric grams per gram. |
| `sugar_per_g` | `double precision` | Numeric grams per gram. |
| `sodium_per_mg` | `double precision` | Existing column name. The name reads as "per mg"; verify semantics before renaming. |
| `is_premium` | `boolean` | Defaults to `false`. |
| `calories_per_g` | `text` | Mismatch: app calculations expect numeric values. |
| `variant` | `text` | Defaults to `Genérica`. |
| `default_portion_grams` | `double precision` | Defaults to `100`. |
| `potassium_mg_per_g` | `double precision` | Confirmed real column name. |
| `vitamin_c_mg_per_g` | `double precision` | Confirmed real column name. |
| `category` | `text` | Optional catalog category. |

Backend response model: `FoodSearchItem` mirrors these real columns. The API
coerces `calories_per_g` from numeric text to a JSON number when Supabase returns
valid numeric text, preserving the frontend calculation contract while the
database type remains pending migration.

### `public.dim_atleta`

Current athlete biometrics table used by `GET /nutrition/targets/{user_id}`.

Important columns used by the backend:

| Column | Type | Notes |
| --- | --- | --- |
| `biometria_id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Required, references `auth.users(id)`. |
| `genero` | `text` | Check: `hombre` or `mujer`. |
| `edad` | `integer` | Used for target calculation. |
| `peso` | `double precision` | Used for target calculation. |
| `altura` | `double precision` | Used for target calculation. |
| `objetivo_metabolico` | `text` | Check: `deficit`, `mantenimiento`, or `superavit`. |
| `dias_entrenamiento_semana` | `integer` | Check: `0` through `7`. |
| `is_current` | `boolean` | Backend filters to current row. |

Risk: the provided real schema has checks for `genero`,
`objetivo_metabolico`, and training days, but does not show logical range checks
for `edad`, `peso`, or `altura`. Persistence should add non-destructive range
checks before relying on this table for production biometric calculations.

### `public.nutrition_logs`

Meal log table used by `POST /nutrition/add-log` and `POST /nutrition/sync-day`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, defaults to `uuid_generate_v4()`. |
| `user_id` | `uuid` | References `auth.users(id)`. Backend writes authenticated `current_user_id`. |
| `food_id` | `uuid` | References `public.catalog_foods(id)`. |
| `meal_slot` | `text` | Required. |
| `quantity_g` | `double precision` | Required. |
| `consumed_at` | `date` | Defaults to `CURRENT_DATE`. |

Confirmed API persistence shape:

- `user_id`
- `food_id`
- `meal_slot`
- `quantity_g`
- `consumed_at`

The backend must continue deriving `user_id` from the authenticated Supabase JWT
and must not accept `user_id` from request bodies.

## Mismatches And Migration Proposal

### `catalog_foods.calories_per_g`

Current type: `text`.

Expected by frontend/backend calculations: numeric value per gram.

Proposed migration, pending human approval and data cleanup review:

```sql
ALTER TABLE public.catalog_foods
  ALTER COLUMN calories_per_g TYPE double precision
  USING NULLIF(trim(calories_per_g), '')::double precision;

ALTER TABLE public.catalog_foods
  ALTER COLUMN calories_per_g SET DEFAULT 0;
```

Before executing, run a read-only audit for non-numeric values:

```sql
SELECT id, name_es, variant, calories_per_g
FROM public.catalog_foods
WHERE calories_per_g IS NOT NULL
  AND trim(calories_per_g) !~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$';
```

No migration was executed as part of this validation.

