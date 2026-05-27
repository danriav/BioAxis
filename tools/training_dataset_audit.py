"""Build anonymized training datasets and audit summaries from reference routines.

This script intentionally reads raw reference files but writes only derived,
de-identified artifacts under docs/training-data.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "Rutinas_de_referencia"
OUTPUT_DIR = ROOT / "docs" / "training-data"

USERS_CSV = SOURCE_DIR / "usuarios_medidas_para_entrenamiento.csv"
ROUTINES_CSV = SOURCE_DIR / "rutinas_para_entrenamiento.csv"

REFERENCE_WORKBOOKS = [
    {
        "alias": f"manual_reference_{idx:02d}.xlsx",
        "path": path,
    }
    for idx, path in enumerate(sorted(SOURCE_DIR.glob("*.xlsx")), start=1)
]

MUSCLE_ALIASES = {
    "abdomen": "abs",
    "abductores": "abductors",
    "aductores": "adductors",
    "antebrazo": "forearms",
    "biceps": "biceps",
    "bíceps": "biceps",
    "cuadriceps": "quads",
    "cuádriceps": "quads",
    "espalda": "back",
    "femoral": "hamstrings",
    "femorales": "hamstrings",
    "gluteo": "glutes",
    "glúteo": "glutes",
    "gluteos": "glutes",
    "glúteos": "glutes",
    "hombro": "shoulders",
    "hombro frontal": "front_delts",
    "hombro lateral": "side_delts",
    "hombro posterior": "rear_delts",
    "pantorrilla": "calves",
    "pantorrillas": "calves",
    "pecho": "chest",
    "triceps": "triceps",
    "tríceps": "triceps",
}

DISPLAY_MUSCLES = {
    "abs": "Abdomen",
    "abductors": "Abductores",
    "adductors": "Aductores",
    "back": "Espalda",
    "biceps": "Bíceps",
    "calves": "Pantorrilla",
    "chest": "Pecho",
    "forearms": "Antebrazo",
    "front_delts": "Hombro frontal",
    "glutes": "Glúteo",
    "hamstrings": "Femoral",
    "quads": "Cuádriceps",
    "rear_delts": "Hombro posterior",
    "shoulders": "Hombros",
    "side_delts": "Hombro lateral",
    "triceps": "Tríceps",
}

MOJIBAKE_REPAIRS = {
    "\u00c3\u00a1": "á",
    "\u00c3\u00a9": "é",
    "\u00c3\u00ad": "í",
    "\u00c3\u00b3": "ó",
    "\u00c3\u00ba": "ú",
    "\u00c3\u00b1": "ñ",
    "\u00c3\u0081": "Á",
    "\u00c3\u0089": "É",
    "\u00c3\u008d": "Í",
    "\u00c3\u0093": "Ó",
    "\u00c3\u009a": "Ú",
    "\u00c3\u0091": "Ñ",
    "\u00c2\u00ba": "º",
    "\u00c2\u00aa": "ª",
    "\u00c2": "",
    "\ufffd": "",
}


def stable_id(value: str, prefix: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]
    return f"{prefix}_{digest}"


def normalize_text(value: Any) -> str:
    if pd.isna(value):
        return ""
    text = str(value)
    for bad, good in MOJIBAKE_REPAIRS.items():
        text = text.replace(bad, good)
    return re.sub(r"\s+", " ", text.strip())


def normalize_muscle(value: Any) -> str:
    text = normalize_text(value).lower()
    text = text.replace(" / ", "/").replace("cuádriceps", "cuadriceps")
    parts = re.split(r"/|,|\+| y ", text)
    codes = []
    for part in parts:
        clean = part.strip()
        clean = clean.replace("cuadriceps", "cuádriceps") if clean == "cuadriceps" else clean
        code = MUSCLE_ALIASES.get(clean)
        if code and code not in codes:
            codes.append(code)
    if codes:
        return "+".join(codes)
    return MUSCLE_ALIASES.get(text, text.replace(" ", "_"))


def split_codes(muscle_code: str) -> list[str]:
    return [code for code in muscle_code.split("+") if code]


def source_col(*parts: str) -> str:
    return "_".join(parts)


def bucket_number(value: float, step: int, suffix: str = "") -> str:
    low = int(value // step * step)
    high = low + step - 1
    return f"{low}-{high}{suffix}"


def bmi_bucket(value: float) -> str:
    if value < 18.5:
        return "under_18_5"
    if value < 25:
        return "18_5_24_9"
    if value < 30:
        return "25_29_9"
    if value < 35:
        return "30_34_9"
    return "35_plus"


def ratio_gap_bucket(value: float) -> str:
    if value < 0.10:
        return "low"
    if value < 0.20:
        return "moderate"
    if value < 0.30:
        return "high"
    return "very_high"


def rest_seconds(value: Any) -> int | None:
    text = normalize_text(value).lower()
    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        return None
    number = float(match.group(1))
    if "min" in text:
        return int(number * 60)
    if "seg" in text or "sec" in text:
        return int(number)
    return int(number)


def reps_range(value: Any) -> dict[str, Any]:
    text = normalize_text(value)
    nums = [int(n) for n in re.findall(r"\d+", text)]
    if len(nums) >= 2:
        return {"min": nums[0], "max": nums[1], "raw": text}
    if len(nums) == 1:
        return {"min": nums[0], "max": nums[0], "raw": text}
    return {"min": None, "max": None, "raw": text}


def rir_range(value: Any) -> dict[str, Any]:
    return reps_range(value)


def read_generated_dataset() -> tuple[pd.DataFrame, pd.DataFrame]:
    users = pd.read_csv(USERS_CSV)
    routines = pd.read_csv(ROUTINES_CSV)
    routines = routines.rename(
        columns={
            "Día": "day_label",
            "Grupo Muscular": "muscle_group",
            "Ejercicio": "exercise_name",
            "Series": "sets",
            "Rango de reps": "rep_range",
            "RIR": "rir",
            "Descanso": "rest",
        }
    )
    return users, routines


def anonymized_profiles(users: pd.DataFrame) -> dict[str, dict[str, Any]]:
    profiles = {}
    for row in users.to_dict("records"):
        raw_id = str(row["user_id"])
        profiles[raw_id] = {
            "profile_id": stable_id(raw_id, "profile"),
            "sex": "male" if row["gender"] == "M" else "female",
            "experience": row["experience"],
            "days_available": int(row["days_available"]),
            "anthropometrics": {
                "height_bucket_cm": bucket_number(float(row[source_col("height", "cm")]), 5, "cm"),
                "weight_bucket_kg": bucket_number(float(row[source_col("weight", "kg")]), 5, "kg"),
                "bmi_bucket": bmi_bucket(float(row["bmi"])),
                "ratio_type": row["ratio_type"],
                "ratio_gap_bucket": ratio_gap_bucket(float(row[source_col("ratio", "gap")])),
            },
        }
    return profiles


def build_clean_dataset(users: pd.DataFrame, routines: pd.DataFrame) -> list[dict[str, Any]]:
    profiles = anonymized_profiles(users)
    dataset = []
    routines = routines.copy()
    routines["muscle_code"] = routines["muscle_group"].map(normalize_muscle)
    routines["rest_seconds"] = routines["rest"].map(rest_seconds)

    for raw_id, group in routines.groupby("user_id", sort=True):
        profile = profiles.get(raw_id)
        if not profile:
            continue

        weekly_volume: Counter[str] = Counter()
        frequency: Counter[str] = Counter()
        days = []
        current_label = None
        current_rows = []
        sequential_days = []
        for record in group.to_dict("records"):
            label = normalize_text(record["day_label"])
            if current_label is not None and label != current_label:
                sequential_days.append((current_label, current_rows))
                current_rows = []
            current_label = label
            current_rows.append(record)
        if current_rows:
            sequential_days.append((current_label, current_rows))

        for day_label, day_records in sequential_days:
            day_muscles = set()
            exercises = []
            for idx, row in enumerate(day_records):
                codes = split_codes(row["muscle_code"])
                contribution = float(row["sets"]) / max(1, len(codes))
                for code in codes:
                    weekly_volume[code] += contribution
                    day_muscles.add(code)
                exercises.append(
                    {
                        "order": idx + 1,
                        "exercise_name": normalize_text(row["exercise_name"]),
                        "muscle_codes": codes,
                        "sets": int(row["sets"]),
                        "rep_range": reps_range(row["rep_range"]),
                        "rir": rir_range(row["rir"]),
                        "rest_seconds": None
                        if pd.isna(row["rest_seconds"])
                        else int(row["rest_seconds"]),
                    }
                )
            for code in day_muscles:
                frequency[code] += 1
            days.append({"day_label": normalize_text(day_label), "exercises": exercises})

        dataset.append(
            {
                **profile,
                "routine": {
                    "source": "synthetic_generated_csv",
                    "weekly_structure": [day["day_label"] for day in days],
                    "days": days,
                    "weekly_volume_sets": {k: round(v, 1) for k, v in sorted(weekly_volume.items())},
                    "muscle_frequency_days": dict(sorted(frequency.items())),
                },
            }
        )
    return dataset


def read_reference_routine_sheets() -> list[dict[str, Any]]:
    rows = []
    for wb_idx, workbook in enumerate(REFERENCE_WORKBOOKS, start=1):
        workbook_path = workbook["path"]
        workbook_alias = workbook["alias"]
        xl = pd.ExcelFile(workbook_path)
        for sheet in xl.sheet_names:
            if "medidas" in sheet.lower():
                continue
            df = pd.read_excel(workbook_path, sheet_name=sheet)
            df = df.loc[:, ~df.columns.astype(str).str.startswith("Unnamed")]
            columns = {normalize_text(col).lower(): col for col in df.columns}
            required = ["día", "grupo muscular", "ejercicio", "series"]
            if not all(key in columns for key in required):
                continue
            for record in df.to_dict("records"):
                if pd.isna(record.get(columns["ejercicio"])):
                    continue
                rows.append(
                    {
                        "source_id": f"manual_ref_{wb_idx}",
                        "source_file_alias": workbook_alias,
                        "sheet_id": stable_id(f"{workbook_alias}:{sheet}", "sheet"),
                        "day_label": normalize_text(record.get(columns["día"])),
                        "muscle_code": normalize_muscle(record.get(columns["grupo muscular"])),
                        "exercise_name": normalize_text(record.get(columns["ejercicio"])),
                        "sets": int(float(record.get(columns["series"], 0))),
                        "rep_range": normalize_text(
                            record.get(columns.get("rango de reps") or columns.get("rango de repeticiones"), "")
                        ),
                        "rir": normalize_text(record.get(columns.get("rir"), "")),
                        "rest": normalize_text(record.get(columns.get("descanso"), "")),
                    }
                )
    return rows


def summarize_patterns(clean_dataset: list[dict[str, Any]], manual_rows: list[dict[str, Any]]) -> dict[str, Any]:
    structures = Counter(tuple(item["routine"]["weekly_structure"]) for item in clean_dataset)
    exercises = Counter()
    muscle_volume: defaultdict[str, list[float]] = defaultdict(list)
    frequency: defaultdict[str, list[int]] = defaultdict(list)
    by_sex_volume: defaultdict[str, defaultdict[str, list[float]]] = defaultdict(lambda: defaultdict(list))

    for item in clean_dataset:
        sex = item["sex"]
        for code, sets in item["routine"]["weekly_volume_sets"].items():
            muscle_volume[code].append(float(sets))
            by_sex_volume[sex][code].append(float(sets))
        for code, days in item["routine"]["muscle_frequency_days"].items():
            frequency[code].append(int(days))
        for day in item["routine"]["days"]:
            for exercise in day["exercises"]:
                exercises[exercise["exercise_name"]] += 1

    manual_volume: defaultdict[str, Counter[str]] = defaultdict(Counter)
    manual_frequency: defaultdict[str, defaultdict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    manual_exercises = Counter()
    for row in manual_rows:
        codes = split_codes(row["muscle_code"])
        contribution = row["sets"] / max(1, len(codes))
        for code in codes:
            manual_volume[row["sheet_id"]][code] += contribution
            manual_frequency[row["sheet_id"]][code].add(row["day_label"])
        manual_exercises[row["exercise_name"]] += 1

    def stats(values: list[float]) -> dict[str, float]:
        series = pd.Series(values, dtype="float")
        return {
            "mean": round(float(series.mean()), 2),
            "median": round(float(series.median()), 2),
            "p25": round(float(series.quantile(0.25)), 2),
            "p75": round(float(series.quantile(0.75)), 2),
        }

    return {
        "source_counts": {
            "generated_profiles": len(clean_dataset),
            "generated_exercise_rows": sum(
                len(day["exercises"]) for item in clean_dataset for day in item["routine"]["days"]
            ),
            "manual_reference_exercise_rows": len(manual_rows),
            "manual_reference_routine_sheets": len({row["sheet_id"] for row in manual_rows}),
        },
        "top_weekly_structures": [
            {"structure": list(structure), "count": count} for structure, count in structures.most_common(10)
        ],
        "generated_volume_stats": {
            DISPLAY_MUSCLES.get(code, code): stats(values) for code, values in sorted(muscle_volume.items())
        },
        "generated_frequency_stats": {
            DISPLAY_MUSCLES.get(code, code): stats(values) for code, values in sorted(frequency.items())
        },
        "generated_volume_by_sex": {
            sex: {DISPLAY_MUSCLES.get(code, code): stats(values) for code, values in sorted(muscles.items())}
            for sex, muscles in by_sex_volume.items()
        },
        "top_exercises_generated": exercises.most_common(20),
        "top_exercises_manual": manual_exercises.most_common(20),
        "manual_volume_by_sheet": {
            sheet_id: {DISPLAY_MUSCLES.get(code, code): round(value, 1) for code, value in sorted(counter.items())}
            for sheet_id, counter in manual_volume.items()
        },
        "manual_frequency_by_sheet": {
            sheet_id: {DISPLAY_MUSCLES.get(code, code): len(days) for code, days in sorted(groups.items())}
            for sheet_id, groups in manual_frequency.items()
        },
    }


def write_long_form_csv(clean_dataset: list[dict[str, Any]], path: Path) -> None:
    fieldnames = [
        "profile_id",
        "sex",
        "experience",
        "days_available",
        "height_bucket_cm",
        "weight_bucket_kg",
        "bmi_bucket",
        "ratio_type",
        "ratio_gap_bucket",
        "day_index",
        "day_label",
        "exercise_order",
        "exercise_name",
        "muscle_codes",
        "sets",
        "rep_min",
        "rep_max",
        "rir_min",
        "rir_max",
        "rest_seconds",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for item in clean_dataset:
            anthro = item["anthropometrics"]
            for day_index, day in enumerate(item["routine"]["days"], start=1):
                for exercise in day["exercises"]:
                    writer.writerow(
                        {
                            "profile_id": item["profile_id"],
                            "sex": item["sex"],
                            "experience": item["experience"],
                            "days_available": item["days_available"],
                            "height_bucket_cm": anthro["height_bucket_cm"],
                            "weight_bucket_kg": anthro["weight_bucket_kg"],
                            "bmi_bucket": anthro["bmi_bucket"],
                            "ratio_type": anthro["ratio_type"],
                            "ratio_gap_bucket": anthro["ratio_gap_bucket"],
                            "day_index": day_index,
                            "day_label": day["day_label"],
                            "exercise_order": exercise["order"],
                            "exercise_name": exercise["exercise_name"],
                            "muscle_codes": "|".join(exercise["muscle_codes"]),
                            "sets": exercise["sets"],
                            "rep_min": exercise["rep_range"]["min"],
                            "rep_max": exercise["rep_range"]["max"],
                            "rir_min": exercise["rir"]["min"],
                            "rir_max": exercise["rir"]["max"],
                            "rest_seconds": exercise["rest_seconds"],
                        }
                    )


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    users, routines = read_generated_dataset()
    clean_dataset = build_clean_dataset(users, routines)
    manual_rows = read_reference_routine_sheets()
    summary = summarize_patterns(clean_dataset, manual_rows)

    jsonl_path = OUTPUT_DIR / "clean_training_dataset.jsonl"
    with jsonl_path.open("w", encoding="utf-8") as handle:
        for item in clean_dataset:
            handle.write(json.dumps(item, ensure_ascii=False, sort_keys=True) + "\n")

    write_long_form_csv(clean_dataset, OUTPUT_DIR / "clean_training_exercises.csv")

    with (OUTPUT_DIR / "clean_training_dataset_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2, sort_keys=True)

    print(json.dumps(summary["source_counts"], indent=2))


if __name__ == "__main__":
    main()
