# Training Data Audit and Program Design Notes

Date: 2026-05-27

Scope audited:

- `Rutinas_de_referencia/manual_reference_01.xlsx`
- `Rutinas_de_referencia/manual_reference_02.xlsx`
- `Rutinas_de_referencia/manual_reference_03.xlsx`
- `Rutinas_de_referencia/manual_reference_04.xlsx`
- `Rutinas_de_referencia/usuarios_medidas_para_entrenamiento.csv`
- `Rutinas_de_referencia/rutinas_para_entrenamiento.csv`

Production code was not changed.

## Privacy Position

The Excel workbooks contain routine sheets mixed with nominal sheets and body-measurement timelines. The clean dataset therefore excludes raw workbook measurements and does not preserve names, original `User_###` IDs, exact body circumferences, exact height, or exact weight.

Clean artifacts produced:

- `docs/training-data/clean_training_dataset.jsonl`
- `docs/training-data/clean_training_exercises.csv`
- `docs/training-data/clean_training_dataset_summary.json`
- `docs/training-data/routine_contract.schema.json`

Anonymization choices:

- Original user IDs are replaced by deterministic SHA-256 based `profile_*` IDs.
- Height and weight are converted into 5-unit buckets.
- BMI is converted into clinical-style buckets.
- Aesthetic ratio adaptation is kept only as `ratio_type` and `ratio_gap_bucket`.
- Manual reference workbook tabs are summarized with anonymous `manual_ref_*` and hashed sheet IDs.

## Source Inventory

The generated CSV corpus contains:

- 100 synthetic or pseudonymous profiles.
- 3,437 exercise prescription rows.
- 18 profile columns in the raw measurements file.
- 9 routine columns in the routine file.

The manual Excel references contain:

- 11 usable routine sheets.
- 291 exercise prescription rows.
- Separate measurement sheets in some workbooks, excluded from the clean dataset.

## Normalized Fields

Profile level:

- `profile_id`
- `sex`
- `experience`
- `days_available`
- `height_bucket_cm`
- `weight_bucket_kg`
- `bmi_bucket`
- `ratio_type`
- `ratio_gap_bucket`

Exercise level:

- `day_index`
- `day_label`
- `exercise_order`
- `exercise_name`
- `muscle_codes`
- `sets`
- `rep_min`
- `rep_max`
- `rir_min`
- `rir_max`
- `rest_seconds`

Muscle labels were normalized into stable codes such as `chest`, `back`, `quads`, `glutes`, `hamstrings`, `side_delts`, `triceps`, `biceps`, `calves`, `adductors`, and `abductors`. Compound labels such as quadriceps/glutes are split and their set contribution is divided across target muscles for weekly-volume summaries.

## Weekly Structure Patterns

Most common structures in the generated dataset:

| Structure | Count |
| --- | ---: |
| Full body | 16 |
| Empuje, Pierna, Tracción, Pierna, Superior, Core | 13 |
| Pierna, Superior, Pierna | 10 |
| Pierna, Empuje, Tracción, Pierna | 9 |
| Pierna, Superior | 8 |
| Superior, Pierna | 7 |
| Pierna, Empuje, Pierna, Tracción, Pierna, Core | 6 |
| Pierna, Tracción, Pierna, Empuje, Pierna | 6 |

Pattern read:

- 1 day uses full body.
- 2 days uses upper/lower or lower/upper.
- 3 days tends toward lower/upper/lower for female-biased routines and push/pull/legs variants for male-biased routines.
- 4 to 6 days increasingly repeat lower or upper exposures.
- Core/cardio appears as a sixth-day add-on in several generated structures.

## Exercise Selection Patterns

Top generated exercises:

| Exercise | Count |
| --- | ---: |
| Elevaciones Laterales en Polea | 157 |
| Curl Bayesian (Polea tras espalda) | 140 |
| Peso Muerto Rumano (Barra) | 106 |
| Elevación de Talón de Pie | 103 |
| Step Up (Enfoque Glúteo) | 101 |
| Peso Muerto Rumano (Mancuernas) | 99 |
| Sentadilla Búlgara | 95 |
| Remo Unilateral con Mancuerna | 95 |
| Donkey Calf Raise | 94 |
| Elevación de Talón Sentado | 91 |

Top manual-reference exercises:

| Exercise | Count |
| --- | ---: |
| Elevaciones de talón | 20 |
| Aductores | 13 |
| Hip thrust | 11 |
| Extensión de cuádriceps | 11 |
| Curl femoral sentado | 11 |
| Press inclinado con mancuernas | 10 |
| Curl predicador | 10 |
| Abductores | 10 |
| Peso muerto rumano con barra | 9 |
| Press militar | 9 |

Pattern read:

- Lower-body hypertrophy templates are built around squat/press patterns, hip thrust, Romanian deadlift, leg curl, abductors/adductors, and calves.
- Upper-body templates repeatedly use incline pressing, vertical/horizontal pulling, lateral raises, preacher/Bayesian curls, and triceps extensions.
- Exercise choice already shows biomechanical intent: stretched-position work for RDL, presses, pulldowns, and cable lateral raises; shortened-position work for hip thrust, leg extension, curls, and pushdowns.

## Weekly Volume Patterns

Generated dataset weekly sets, all profiles:

| Muscle | Mean | Median | P25 | P75 |
| --- | ---: | ---: | ---: | ---: |
| Hombros | 13.14 | 12.0 | 10.0 | 16.0 |
| Cuádriceps | 12.76 | 12.0 | 12.0 | 15.0 |
| Espalda | 12.69 | 12.0 | 10.0 | 16.0 |
| Glúteo | 11.90 | 12.0 | 8.0 | 16.0 |
| Femoral | 11.85 | 12.0 | 10.0 | 12.5 |
| Pecho | 10.92 | 9.0 | 6.0 | 14.0 |
| Pantorrilla | 9.31 | 9.0 | 8.0 | 12.0 |
| Bíceps | 8.52 | 8.0 | 6.0 | 12.0 |
| Tríceps | 8.52 | 8.0 | 6.0 | 12.0 |
| Abductores | 7.74 | 6.0 | 6.0 | 9.0 |
| Aductores | 7.11 | 6.0 | 6.0 | 8.25 |

Generated dataset weekly sets by sex:

| Sex | Chest | Back | Shoulders | Quads | Glutes | Hamstrings |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Male | 11.76 | 13.51 | 14.12 | 13.20 | 11.92 | 12.29 |
| Female | 10.12 | 11.90 | 12.20 | 12.33 | 11.88 | 11.43 |

Pattern read:

- The generated CSV distributes a fairly high baseline volume across most major muscles.
- Male-biased profiles increase shoulders, back, and chest.
- Female-biased profiles still maintain meaningful upper-body work, but keep lower-body volume central.
- Most medians sit inside a practical hypertrophy range, but some upper quartile targets approach 16 to 20 sets and should remain capped.

## Frequency Patterns

Generated median weekly frequency:

- Quads, glutes, hamstrings, calves, adductors, and abductors: usually 2 days/week.
- Chest, back, shoulders, biceps, and triceps: usually 1 to 2 days/week.
- Abs/cardio: usually 1 day/week when present.

Pattern read:

- The corpus favors frequency 2 for lower-body muscles.
- Upper-body frequency depends strongly on available days.
- The day-label export does not include explicit calendar positions; the cleaner infers sessions by sequential day-label changes.

## Progression Patterns

The reference routines provide set counts, rep ranges, RIR, rest, and some week/month placeholder columns, but they do not contain a complete longitudinal progression model.

Observed usable progression signals:

- Heavy compounds commonly use 6-8 or 8-10 reps with 0-2 RIR and 180 seconds rest.
- Accessories commonly use 10-15 reps with 0-2 RIR and 120 seconds rest.
- The dataset is compatible with double progression: add reps inside the range, then load, then reset toward the lower bound.
- RIR can wave from 2 toward 0-1 across mesocycle weeks, followed by deload.

Missing for future training:

- Week-by-week load.
- Actual reps performed.
- Exercise substitutions due to pain/equipment.
- Deload outcomes.
- Adherence and session duration.

## Adaptation by Body Measures

The existing generator encodes aesthetic-ratio adaptation:

- Male profiles use shoulder-to-waist ratio against a golden-ratio target.
- Female profiles use waist-to-hip ratio against an hourglass-ratio target.
- The internal aesthetic-ratio distance scales priority muscles up to roughly 25 percent before clamping; the clean artifacts keep only the bucketed category.

Recommended safe adaptation in production:

- Use exact body measures only transiently inside the request context.
- Store buckets and derived priority categories, not raw circumferences, unless the user explicitly opts into measurement history.
- Separate body-composition/health logic from aesthetics language in user-facing copy.
- Always allow constraints and exclusions to override aesthetic priorities.

## Contract Recommendation

Use `docs/training-data/routine_contract.schema.json` as the target contract for generated routines. It extends the current backend training schema with fields the dataset needs:

- Explicit anonymous input profile.
- Frequency 1-7 days.
- Split type.
- Weekly volume targets.
- Progression block.
- Session-level focus and estimated minutes.
- Exercise-level rep range, RIR range, rest, biomechanical bias, and weekly set contribution.
- Quality checks and warnings.

Important mismatch:

- `backend/app/schemas/training.py` currently limits `TrainingPlanCreate.frequency_days` to 3-6.
- The audited dataset contains valid 1, 2, and 7 day structures.
- Production should not consume the new contract directly until backend constraints are intentionally updated or a narrower production adapter is defined.

## Architecture Recommendation

Use a hybrid deterministic engine plus IA, not fine-tuning yet.

Recommended sequence:

1. Deterministic rules engine
   - Own split selection, weekly volume caps, frequency, time budget, exercise limits, contraindications, and schema validation.
   - This should be the source of truth for safety and consistency.

2. RAG with curated examples
   - Retrieve anonymized examples from `clean_training_dataset.jsonl`.
   - Use examples to guide exercise ordering, language, substitutions, and nuance by biotype/objective.
   - Keep retrieval constrained by sex, experience, days available, goal, ratio bucket, equipment, and exclusions.

3. IA generation layer
   - Fill human-readable coaching notes.
   - Suggest substitutions.
   - Explain tradeoffs.
   - Never bypass deterministic caps or quality checks.

4. Future fine-tuning
   - Only after the dataset includes validated outcomes, explicit progression data, substitutions, adherence, injuries/pain flags, and coach-approved labels.
   - Current data is useful for RAG and rules calibration, but not enough for supervised fine-tuning quality.

## Validation Gates Before Production

- Confirm whether the CSV profiles are synthetic only; if any are real, keep the clean dataset only and remove raw originals from version control history before broader sharing.
- Add schema validation for generated routines.
- Add weekly-volume cap tests by muscle.
- Add session-time budget tests.
- Add duplicate exercise and repeated-pattern checks.
- Add constraint tests for injury/equipment exclusions.
- Decide whether production supports 1, 2, and 7 day plans; current backend schema does not.
- Create a small coach-review set before exposing IA-generated routines to users.
