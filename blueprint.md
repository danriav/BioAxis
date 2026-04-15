# HealthTech Ecosystem — Full Architecture Document
**Version:** 1.0.0 | **Stack:** FastAPI · PostgreSQL/Supabase · Next.js · TanStack Query · IndexedDB

---

## TABLE OF CONTENTS

1. [Database Schema (English)](#1-database-schema)
2. [Sync Strategy — Offline-First with TanStack Query](#2-sync-strategy)
3. [Wiki Content — Bilingual Definitions (ES / EN)](#3-wiki-content)
4. [`.cursorrules` — Golden Rules for Cursor](#4-cursorrules)

---

## 1. DATABASE SCHEMA

> **Convention:** snake_case identifiers, UTC timestamps, soft-deletes via `deleted_at`.

### 1.1 Users & Profiles

```sql
-- ─────────────────────────────────────────
-- USERS (managed by Supabase Auth)
-- ─────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- USER PROFILES — Anthropometric & Preferences
-- ─────────────────────────────────────────
CREATE TABLE user_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Demographics
  display_name          TEXT NOT NULL,
  birth_date            DATE,
  biological_sex        TEXT CHECK (biological_sex IN ('male','female','other')),
  preferred_locale      TEXT DEFAULT 'es',       -- BCP-47: 'es', 'en', etc.

  -- Anthropometry (all in metric SI units)
  height_cm             NUMERIC(5,2),
  weight_kg             NUMERIC(5,2),
  body_fat_pct          NUMERIC(4,2),

  -- Limb proportions for biomechanical compensation
  femur_length_cm       NUMERIC(5,2),
  torso_length_cm       NUMERIC(5,2),
  arm_span_cm           NUMERIC(5,2),

  -- Fitness context
  fitness_level         TEXT CHECK (fitness_level IN ('beginner','intermediate','advanced','elite')),
  primary_goal          TEXT CHECK (primary_goal IN (
                          'hypertrophy','strength','fat_loss',
                          'endurance','general_health','sport_performance'
                        )),
  gender_focus          TEXT CHECK (gender_focus IN ('upper_body','lower_body','balanced')),
                        -- 'upper_body' default for male, 'lower_body' default for female (overridable)

  -- Subscription
  subscription_tier     TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','premium','elite')),

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  UNIQUE (user_id)
);
```

---

### 1.2 Exercise Catalog

```sql
-- ─────────────────────────────────────────
-- MUSCLE GROUPS
-- ─────────────────────────────────────────
CREATE TABLE muscle_groups (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,  -- 'quadriceps', 'glutes', 'hamstrings', etc.
  body_region TEXT CHECK (body_region IN ('upper_body','lower_body','core'))
);

-- ─────────────────────────────────────────
-- EXERCISES — Core catalog
-- ─────────────────────────────────────────
CREATE TABLE exercises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  canonical_name        TEXT UNIQUE NOT NULL,   -- e.g. 'barbell_back_squat'
  equipment_type        TEXT CHECK (equipment_type IN (
                          'barbell','dumbbell','cable','machine',
                          'bodyweight','resistance_band','kettlebell','smith_machine'
                        )),
  movement_pattern      TEXT CHECK (movement_pattern IN (
                          'squat','hinge','push_horizontal','push_vertical',
                          'pull_horizontal','pull_vertical','lunge','carry','isolation'
                        )),

  -- Biomechanical profile
  primary_muscle_group  INTEGER REFERENCES muscle_groups(id),
  joint_complexity      INTEGER CHECK (joint_complexity BETWEEN 1 AND 3),
                        -- 1=isolation, 2=compound, 3=multi-joint complex

  -- Articular focus flags (core biomechanics feature)
  allows_quad_focus     BOOLEAN DEFAULT FALSE,
  allows_glute_focus    BOOLEAN DEFAULT FALSE,

  -- Technical metadata
  is_bilateral          BOOLEAN DEFAULT TRUE,
  requires_spotter      BOOLEAN DEFAULT FALSE,

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- EXERCISE VARIANTS — Biomechanical setup per focus
-- ─────────────────────────────────────────
CREATE TABLE exercise_variants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id               UUID REFERENCES exercises(id) ON DELETE CASCADE,

  variant_key               TEXT NOT NULL,
  -- e.g. 'quad_focus', 'glute_focus', 'neutral', 'wide_stance', 'sumo'

  -- Biomechanical cues (stored per locale via join to variant_translations)
  knee_travel_past_toe      BOOLEAN,   -- TRUE = quad bias; FALSE = glute bias
  shin_angle_target_deg     NUMERIC(4,1),   -- vertical shin = ~90°
  hip_hinge_depth_desc      TEXT,           -- 'minimal','moderate','deep'
  torso_lean_target_deg     NUMERIC(4,1),

  -- Recommended setup adjustments
  stance_width_modifier     TEXT CHECK (stance_width_modifier IN ('narrow','hip_width','wide','sumo')),
  foot_elevation_mm         INTEGER DEFAULT 0,   -- heel elevation for quad focus

  UNIQUE (exercise_id, variant_key)
);

-- ─────────────────────────────────────────
-- EXERCISE TRANSLATIONS (i18n)
-- ─────────────────────────────────────────
CREATE TABLE exercise_translations (
  id            SERIAL PRIMARY KEY,
  exercise_id   UUID REFERENCES exercises(id) ON DELETE CASCADE,
  locale        TEXT NOT NULL,   -- 'es', 'en'

  display_name  TEXT NOT NULL,
  description   TEXT,
  execution_cues TEXT[],        -- Array of coaching cues

  UNIQUE (exercise_id, locale)
);

CREATE TABLE exercise_variant_translations (
  id            SERIAL PRIMARY KEY,
  variant_id    UUID REFERENCES exercise_variants(id) ON DELETE CASCADE,
  locale        TEXT NOT NULL,

  display_name  TEXT NOT NULL,
  setup_cues    TEXT[],

  UNIQUE (variant_id, locale)
);

-- ─────────────────────────────────────────
-- MUSCLE GROUP TRANSLATIONS (i18n)
-- ─────────────────────────────────────────
CREATE TABLE muscle_group_translations (
  id              SERIAL PRIMARY KEY,
  muscle_group_id INTEGER REFERENCES muscle_groups(id) ON DELETE CASCADE,
  locale          TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  UNIQUE (muscle_group_id, locale)
);
```

---

### 1.3 Training Plans & Programs

```sql
-- ─────────────────────────────────────────
-- TRAINING PLANS
-- ─────────────────────────────────────────
CREATE TABLE training_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,

  plan_name           TEXT NOT NULL,
  frequency_days      INTEGER CHECK (frequency_days BETWEEN 3 AND 5),
  duration_weeks      INTEGER DEFAULT 8,
  is_active           BOOLEAN DEFAULT TRUE,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- TRAINING SESSIONS (days within a plan)
-- ─────────────────────────────────────────
CREATE TABLE training_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID REFERENCES training_plans(id) ON DELETE CASCADE,

  day_number      INTEGER NOT NULL,   -- 1 to frequency_days
  session_label   TEXT,               -- e.g. 'Lower A', 'Push', 'Full Body'

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- SESSION EXERCISES — Prescribed work
-- ─────────────────────────────────────────
CREATE TABLE session_exercises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_id           UUID REFERENCES exercises(id),
  variant_id            UUID REFERENCES exercise_variants(id),

  exercise_order        INTEGER NOT NULL,
  prescribed_sets       INTEGER CHECK (prescribed_sets BETWEEN 1 AND 8),
  rep_range_min         INTEGER,
  rep_range_max         INTEGER,
  rir_target            INTEGER CHECK (rir_target BETWEEN 0 AND 4),
                        -- RIR = Reps In Reserve

  rest_seconds          INTEGER DEFAULT 120,

  -- Weekly volume tracking (enforced at application layer)
  -- Hard cap: 20 sets/week per muscle group
  weekly_set_contribution INTEGER DEFAULT 1   -- how many sets this entry counts
                                               -- toward muscle weekly volume
);

-- ─────────────────────────────────────────
-- WEEKLY VOLUME SUMMARY (materialized or computed)
-- Used to enforce the 20-set/week per-muscle cap
-- ─────────────────────────────────────────
CREATE TABLE weekly_volume_caps (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id             UUID REFERENCES training_plans(id) ON DELETE CASCADE,
  muscle_group_id     INTEGER REFERENCES muscle_groups(id),

  week_number         INTEGER NOT NULL,
  total_sets          INTEGER DEFAULT 0,
  cap_sets            INTEGER DEFAULT 20,    -- configurable per user

  UNIQUE (user_id, plan_id, muscle_group_id, week_number),
  CONSTRAINT weekly_volume_cap_check CHECK (total_sets <= cap_sets)
);
```

---

### 1.4 Workout Logs

```sql
-- ─────────────────────────────────────────
-- WORKOUT LOG SESSIONS
-- ─────────────────────────────────────────
CREATE TABLE workout_log_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES training_sessions(id),

  started_at          TIMESTAMPTZ NOT NULL,
  completed_at        TIMESTAMPTZ,
  duration_seconds    INTEGER,
  notes               TEXT,

  -- Sync metadata
  client_id           TEXT,       -- device/browser UUID for conflict resolution
  synced_at           TIMESTAMPTZ,
  local_version       INTEGER DEFAULT 1,

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- WORKOUT LOG SETS — Actual performed work
-- ─────────────────────────────────────────
CREATE TABLE workout_log_sets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_session_id        UUID REFERENCES workout_log_sessions(id) ON DELETE CASCADE,
  exercise_id           UUID REFERENCES exercises(id),
  variant_id            UUID REFERENCES exercise_variants(id),

  set_number            INTEGER NOT NULL,
  reps_performed        INTEGER,
  weight_kg             NUMERIC(6,2),
  rir_actual            INTEGER CHECK (rir_actual BETWEEN 0 AND 10),
  rpe_actual            NUMERIC(3,1) CHECK (rpe_actual BETWEEN 1 AND 10),

  -- Technique notes
  technique_rating      INTEGER CHECK (technique_rating BETWEEN 1 AND 5),
  pain_flag             BOOLEAN DEFAULT FALSE,

  -- Sync metadata
  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER DEFAULT 1,

  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 1.5 Nutrition

```sql
-- ─────────────────────────────────────────
-- FOOD ITEMS — Custom + Open Food Facts
-- ─────────────────────────────────────────
CREATE TABLE food_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id),  -- NULL = global catalog
  source                TEXT DEFAULT 'custom' CHECK (source IN ('custom','open_food_facts','usda')),
  external_id           TEXT,   -- barcode or external API ID

  -- Names per locale
  name_es               TEXT NOT NULL,
  name_en               TEXT,
  brand                 TEXT,

  -- Macros per 100g
  calories_per_100g     NUMERIC(7,2),
  protein_g             NUMERIC(6,2),
  carbs_g               NUMERIC(6,2),
  fat_g                 NUMERIC(6,2),

  -- Tracked micros per 100g
  fiber_g               NUMERIC(6,2),
  sugar_g               NUMERIC(6,2),
  sodium_mg             NUMERIC(7,2),
  saturated_fat_g       NUMERIC(6,2),
  trans_fat_g           NUMERIC(6,2),

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- BASE MEALS — Reusable meal templates
-- ─────────────────────────────────────────
CREATE TABLE base_meals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  meal_name     TEXT NOT NULL,   -- e.g. 'Desayuno habitual', 'Post-workout shake'
  meal_slot     TEXT CHECK (meal_slot IN (
                  'breakfast','mid_morning','lunch','snack','dinner','post_workout','pre_workout'
                )),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE base_meal_items (
  id              SERIAL PRIMARY KEY,
  base_meal_id    UUID REFERENCES base_meals(id) ON DELETE CASCADE,
  food_item_id    UUID REFERENCES food_items(id),
  amount_g        NUMERIC(7,2) NOT NULL
);

-- ─────────────────────────────────────────
-- NUTRITION LOG — Daily diary
-- ─────────────────────────────────────────
CREATE TABLE nutrition_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL,

  -- Optional: link to a cloned day source
  cloned_from_log_id  UUID REFERENCES nutrition_logs(id),

  notes           TEXT,

  -- Sync metadata
  client_id       TEXT,
  synced_at       TIMESTAMPTZ,
  local_version   INTEGER DEFAULT 1,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE TABLE nutrition_log_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id          UUID REFERENCES nutrition_logs(id) ON DELETE CASCADE,
  food_item_id    UUID REFERENCES food_items(id),
  base_meal_id    UUID REFERENCES base_meals(id),   -- NULL if added individually

  meal_slot       TEXT,
  amount_g        NUMERIC(7,2) NOT NULL,
  entry_time      TIME,

  -- Computed totals (denormalized for offline read performance)
  calories        NUMERIC(7,2),
  protein_g       NUMERIC(6,2),
  carbs_g         NUMERIC(6,2),
  fat_g           NUMERIC(6,2),
  fiber_g         NUMERIC(6,2),
  sugar_g         NUMERIC(6,2),
  sodium_mg       NUMERIC(7,2),
  saturated_fat_g NUMERIC(6,2),
  trans_fat_g     NUMERIC(6,2),

  -- Sync metadata
  client_id       TEXT,
  synced_at       TIMESTAMPTZ,
  local_version   INTEGER DEFAULT 1,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- NUTRITION TARGETS
-- ─────────────────────────────────────────
CREATE TABLE nutrition_targets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  effective_date          DATE NOT NULL,

  calories_target         INTEGER,
  protein_g_target        NUMERIC(6,2),
  carbs_g_target          NUMERIC(6,2),
  fat_g_target            NUMERIC(6,2),
  fiber_g_min             NUMERIC(6,2),
  sugar_g_max             NUMERIC(6,2),
  sodium_mg_max           NUMERIC(7,2),
  saturated_fat_g_max     NUMERIC(6,2),
  trans_fat_g_max         NUMERIC(6,2) DEFAULT 2.0,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, effective_date)
);
```

---

### 1.6 Sync Queue (for Offline-First)

```sql
-- ─────────────────────────────────────────
-- SYNC QUEUE — Tracks pending mutations from clients
-- ─────────────────────────────────────────
CREATE TABLE sync_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id       TEXT NOT NULL,

  entity_type     TEXT NOT NULL,   -- 'workout_log_session', 'nutrition_log', etc.
  entity_id       UUID NOT NULL,
  operation       TEXT CHECK (operation IN ('create','update','delete')),
  payload         JSONB NOT NULL,

  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','synced','conflict','failed')),
  conflict_data   JSONB,           -- server version snapshot on conflict
  retry_count     INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_user_status ON sync_queue (user_id, status);
CREATE INDEX idx_sync_queue_entity ON sync_queue (entity_type, entity_id);
```

---

## 2. SYNC STRATEGY — OFFLINE-FIRST WITH TANSTACK QUERY

### 2.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  CLIENT (Next.js / Android WebView)                      │
│                                                          │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────┐  │
│  │  React UI   │──▶│  TanStack Query  │──▶│IndexedDB │  │
│  │  Components │   │  (cache layer)   │   │(Dexie.js)│  │
│  └─────────────┘   └──────┬───────────┘   └──────────┘  │
│                           │                              │
│                    ┌──────▼──────────┐                   │
│                    │ Service Worker  │                   │
│                    │ (Background     │                   │
│                    │  Sync API)      │                   │
│                    └──────┬──────────┘                   │
└───────────────────────────┼──────────────────────────────┘
                            │ (when online)
                ┌───────────▼────────────┐
                │   FastAPI Backend      │
                │   /api/v1/sync         │
                │   Supabase PostgreSQL  │
                └────────────────────────┘
```

### 2.2 IndexedDB Schema (Dexie.js)

```typescript
// lib/db/local.db.ts

import Dexie, { Table } from 'dexie';

export interface LocalWorkoutLog {
  id: string;
  userId: string;
  trainingSessionId: string | null;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  clientId: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
  localVersion: number;
  updatedAt: string;
}

export interface LocalNutritionLog {
  id: string;
  userId: string;
  logDate: string;     // ISO 'YYYY-MM-DD'
  clonedFromLogId: string | null;
  notes: string | null;
  clientId: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
  localVersion: number;
  updatedAt: string;
}

export interface LocalSyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: object;
  status: 'pending' | 'processing' | 'synced' | 'failed';
  retryCount: number;
  createdAt: string;
}

export class HealthAppDB extends Dexie {
  workoutLogs!: Table<LocalWorkoutLog>;
  nutritionLogs!: Table<LocalNutritionLog>;
  exercises!: Table<{ id: string; [key: string]: unknown }>;
  foodItems!: Table<{ id: string; [key: string]: unknown }>;
  syncQueue!: Table<LocalSyncQueueItem>;

  constructor() {
    super('HealthAppDB');
    this.version(1).stores({
      workoutLogs:   'id, userId, syncStatus, updatedAt',
      nutritionLogs: 'id, userId, logDate, syncStatus',
      exercises:     'id, canonicalName',
      foodItems:     'id, nameEs, nameEn',
      syncQueue:     'id, entityType, entityId, status, createdAt',
    });
  }
}

export const localDb = new HealthAppDB();
```

---

### 2.3 TanStack Query Configuration

```typescript
// lib/query/query-client.ts

import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          5 * 60 * 1000,   // 5 minutes — serves cached data
      gcTime:             24 * 60 * 60 * 1000,  // 24 hours in IndexedDB
      retry:              2,
      networkMode:        'offlineFirst',   // ← critical: serve cache when offline
      refetchOnWindowFocus: false,
    },
    mutations: {
      networkMode: 'offlineFirst',          // ← queue mutations when offline
      retry:       3,
    },
  },
});

// Persist cache to localStorage (lightweight; heavy data lives in IndexedDB)
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'HEALTH_APP_CACHE',
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 24 * 60 * 60 * 1000,
});
```

---

### 2.4 Optimistic Mutation with Auto-Sync

```typescript
// hooks/useLogWorkoutSet.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/db/local.db';
import { syncQueueService } from '@/lib/sync/sync-queue.service';
import { generateClientId } from '@/lib/utils/uuid';
import type { WorkoutLogSet } from '@/types/workout';

export function useLogWorkoutSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSet: Omit<WorkoutLogSet, 'id' | 'clientId' | 'syncStatus'>) => {
      const entry = {
        ...newSet,
        id:          crypto.randomUUID(),
        clientId:    generateClientId(),
        syncStatus:  'pending' as const,
        localVersion: 1,
        createdAt:   new Date().toISOString(),
      };

      // 1. Write immediately to IndexedDB (offline-safe)
      await localDb.workoutLogs.add(entry);

      // 2. Enqueue for server sync
      await syncQueueService.enqueue({
        entityType: 'workout_log_set',
        entityId:   entry.id,
        operation:  'create',
        payload:    entry,
      });

      return entry;
    },

    // 3. Optimistic update — UI reflects change instantly
    onMutate: async (newSet) => {
      await queryClient.cancelQueries({ queryKey: ['workoutLogs', newSet.logSessionId] });

      const previousData = queryClient.getQueryData<WorkoutLogSet[]>(
        ['workoutLogs', newSet.logSessionId]
      );

      queryClient.setQueryData(
        ['workoutLogs', newSet.logSessionId],
        (old: WorkoutLogSet[] = []) => [
          ...old,
          { ...newSet, id: 'temp-' + Date.now(), syncStatus: 'pending' },
        ]
      );

      return { previousData };
    },

    // 4. Rollback on error
    onError: (_err, newSet, context) => {
      queryClient.setQueryData(
        ['workoutLogs', newSet.logSessionId],
        context?.previousData
      );
    },

    // 5. Invalidate to trigger background refetch
    onSettled: (_data, _err, newSet) => {
      queryClient.invalidateQueries({ queryKey: ['workoutLogs', newSet.logSessionId] });
    },
  });
}
```

---

### 2.5 Background Sync Service Worker

```javascript
// public/sw.js

const CACHE_NAME   = 'health-app-v1';
const SYNC_TAG     = 'sync-pending-mutations';
const API_BASE_URL = '/api/v1';

// ── Install: pre-cache app shell ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/',
        '/offline',
        '/manifest.json',
        '/_next/static/css/app.css',
      ])
    )
  );
  self.skipWaiting();
});

// ── Fetch: serve from cache first ────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API calls: network-first, fall to queue
  if (request.url.includes(API_BASE_URL)) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ offline: true, queued: true }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// ── Background Sync: flush queue when back online ────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushSyncQueue());
  }
});

async function flushSyncQueue() {
  // Open IndexedDB via idb-keyval or direct IDBFactory
  const db = await openLocalDb();
  const pendingItems = await db.getAllFromIndex('syncQueue', 'status', 'pending');

  for (const item of pendingItems) {
    try {
      await db.put('syncQueue', { ...item, status: 'processing' });

      const response = await fetch(`${API_BASE_URL}/sync`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(item),
      });

      if (response.ok) {
        await db.put('syncQueue', { ...item, status: 'synced' });
      } else if (response.status === 409) {
        // Conflict: store server version for UI resolution
        const conflictData = await response.json();
        await db.put('syncQueue', { ...item, status: 'conflict', conflictData });
      } else {
        await db.put('syncQueue', {
          ...item,
          status:     'failed',
          retryCount: item.retryCount + 1,
        });
      }
    } catch {
      await db.put('syncQueue', {
        ...item,
        status:     'failed',
        retryCount: item.retryCount + 1,
      });
    }
  }
}
```

---

### 2.6 FastAPI Sync Endpoint

```python
# api/v1/sync.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, UUID4
from typing import Literal
from datetime import datetime
from uuid import UUID

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.sync.conflict_resolver import resolve_conflict

router = APIRouter(prefix="/sync", tags=["sync"])


class SyncItem(BaseModel):
    id:           UUID4
    entity_type:  str
    entity_id:    UUID4
    operation:    Literal["create", "update", "delete"]
    payload:      dict
    local_version: int
    client_id:    str
    created_at:   datetime


@router.post("/", status_code=status.HTTP_200_OK)
async def sync_item(
    item: SyncItem,
    current_user = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Accepts a single sync item from the client queue.
    Returns 200 on success, 409 on conflict with server snapshot.
    """
    server_entity = await db.fetch_entity(item.entity_type, item.entity_id)

    if server_entity and server_entity.local_version > item.local_version:
        # Conflict detected — return server version for client-side resolution
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "conflict":      True,
                "server_version": server_entity.dict(),
                "client_version": item.payload,
            },
        )

    await db.upsert_entity(
        entity_type=item.entity_type,
        entity_id=item.entity_id,
        payload=item.payload,
        synced_at=datetime.utcnow(),
    )

    return {"synced": True, "entity_id": str(item.entity_id)}


@router.post("/batch", status_code=status.HTTP_207_MULTI_STATUS)
async def sync_batch(
    items: list[SyncItem],
    current_user = Depends(get_current_user),
    db = Depends(get_db),
):
    """Batch sync — processes up to 50 items, returns per-item results."""
    if len(items) > 50:
        raise HTTPException(status_code=400, detail="Max 50 items per batch")

    results = []
    for item in items:
        try:
            result = await sync_item(item, current_user, db)
            results.append({"id": str(item.id), "status": "synced", **result})
        except HTTPException as exc:
            results.append({"id": str(item.id), "status": "conflict", "detail": exc.detail})

    return {"results": results}
```

---

## 3. WIKI CONTENT — BILINGUAL DEFINITIONS

> Format: each term includes Spanish (primary) and English definitions.
> Tone: scientific-professional, accessible to intermediate fitness practitioners.

---

### 3.1 RIR — Repeticiones en Reserva / Reps In Reserve

**ES — Español**

> **RIR (Repeticiones en Reserva)** es una métrica de intensidad subjetiva que cuantifica cuántas repeticiones adicionales podría ejecutar un atleta antes de alcanzar el fallo muscular concéntrico absoluto. Una calificación de **RIR 2** significa que el sujeto detiene la serie cuando aún dispone de 2 repeticiones de capacidad residual.
>
> **Base fisiológica:** Evidencia reciente en ciencias del ejercicio (Schoenfeld, Helms et al.) demuestra que el entrenamiento en el rango de RIR 0–4 estimula el reclutamiento de unidades motoras de alto umbral (fibras tipo IIx), condición necesaria para la síntesis proteica miofibrilar óptima. Trabajar consistentemente en RIR > 4 reduce la densidad de estímulo mecánico, comprometiendo las adaptaciones hipertróficas.
>
> **Aplicación práctica:** En este sistema, los bloques de acumulación utilizan RIR 3–4; los bloques de intensificación progresan a RIR 1–2; las semanas de realización (peak) operan en RIR 0–1.

**EN — English**

> **RIR (Reps In Reserve)** is a subjective intensity metric quantifying how many additional repetitions an athlete could perform before reaching absolute concentric muscular failure. An **RIR of 2** means the set is terminated when 2 repetitions of residual capacity remain.
>
> **Physiological basis:** Current exercise science literature demonstrates that training within the RIR 0–4 window maximizes the recruitment of high-threshold motor units (type IIx fibers), a prerequisite for optimal myofibrillar protein synthesis. Consistently training at RIR > 4 reduces mechanical tension density, limiting hypertrophic adaptations.
>
> **Application:** In this system, accumulation blocks use RIR 3–4; intensification blocks progress to RIR 1–2; realization (peak) weeks operate at RIR 0–1.

---

### 3.2 Brazo de Momento / Moment Arm

**ES — Español**

> **Brazo de Momento** es la distancia perpendicular entre el eje de rotación de una articulación y la línea de acción de la fuerza aplicada (ya sea gravitacional, de resistencia o muscular). Matemáticamente: **Torque = Fuerza × Brazo de Momento**.
>
> **Implicación en biomecánica del entrenamiento:** Al modificar la posición articular durante un ejercicio, se altera el brazo de momento de los músculos implicados, redistribuyendo la carga mecánica entre grupos musculares. Por ejemplo, en la sentadilla con inclinación hacia adelante del torso, el brazo de momento del torque extensor de cadera aumenta, incrementando la demanda sobre los glúteos e isquiotibiales. Conversely, mantener el torso vertical maximiza el brazo de momento del cuádriceps sobre la articulación de la rodilla.
>
> **Relevancia clínica:** Comprender los brazos de momento permite al entrenador seleccionar variantes de ejercicio que maximicen la tensión sobre el músculo objetivo con mínimo riesgo articular.

**EN — English**

> **Moment Arm** is the perpendicular distance between a joint's axis of rotation and the line of action of an applied force (gravitational, resistive, or muscular). Mathematically: **Torque = Force × Moment Arm**.
>
> **Training biomechanics implication:** Modifying joint position alters the moment arm of the muscles involved, redistributing mechanical load across muscle groups. For instance, increasing forward torso lean during a squat lengthens the hip extensor moment arm, increasing the mechanical demand on the gluteus maximus and hamstrings. Conversely, maintaining a vertical torso maximizes the quadriceps moment arm at the knee joint.
>
> **Clinical relevance:** Understanding moment arms allows coaches to select exercise variants that maximize tension on the target muscle while minimizing articular stress.

---

### 3.3 Macronutrientes / Macronutrients

**ES — Español**

> Los **macronutrientes** son los compuestos orgánicos que el organismo requiere en cantidades grámicas para obtener energía y sustratos estructurales. Los tres macronutrientes principales son:
>
> - **Proteínas (4 kcal/g):** Polímeros de aminoácidos esenciales para la síntesis proteica muscular (MPS), función enzimática e inmunológica. La recomendación para objetivos de hipertrofia es 1.6–2.2 g/kg de peso corporal/día (Morton et al., 2018).
> - **Carbohidratos (4 kcal/g):** Fuente primaria de glucosa para la resíntesis de ATP en esfuerzos de alta intensidad vía glucólisis y fosforilación oxidativa del piruvato. El glucógeno muscular es el limitante del rendimiento en sesiones superiores a 60 minutos.
> - **Grasas (9 kcal/g):** Substrato energético predominante en actividad de baja-moderada intensidad; indispensables para la síntesis hormonal esteroidea (testosterona, estrógenos), absorción de vitaminas liposolubles (A, D, E, K) e integridad de membranas celulares.

**EN — English**

> **Macronutrients** are organic compounds the body requires in gram quantities for energy production and structural substrates. The three primary macronutrients are:
>
> - **Proteins (4 kcal/g):** Amino acid polymers essential for muscle protein synthesis (MPS), enzymatic function, and immune responses. For hypertrophy goals, 1.6–2.2 g/kg body weight/day is supported by meta-analytic evidence (Morton et al., 2018).
> - **Carbohydrates (4 kcal/g):** Primary source of glucose for ATP resynthesis during high-intensity efforts via glycolysis and pyruvate oxidative phosphorylation. Muscle glycogen is the primary performance limiter in sessions exceeding 60 minutes.
> - **Fats (9 kcal/g):** Predominant energy substrate during low-to-moderate intensity activity; indispensable for steroid hormone synthesis (testosterone, estrogens), fat-soluble vitamin absorption (A, D, E, K), and cell membrane integrity.

---

### 3.4 Fibra Dietética / Dietary Fiber

**ES — Español**

> La **fibra dietética** comprende polisacáridos y oligosacáridos de origen vegetal no digeribles por las enzimas del intestino delgado humano, clasificados en:
>
> - **Fibra soluble:** Se disuelve en agua formando geles viscosos (pectinas, betaglucanos, inulina). Ralentiza el vaciamiento gástrico, atenúa el pico glucémico postprandial y reduce la reabsorción de colesterol LDL mediante la formación de micelas biliares.
> - **Fibra insoluble:** Aumenta el bolo fecal y acelera el tránsito intestinal (celulosa, hemicelulosa, lignina), reduciendo la exposición de la mucosa colónica a metabolitos potencialmente genotóxicos.
>
> **Recomendación:** 25–38 g/día según género y peso corporal (Academy of Nutrition and Dietetics). En contexto deportivo, un consumo adecuado de fibra contribuye a la salud del microbioma, la modulación inflamatoria y la optimización de la composición corporal.

**EN — English**

> **Dietary fiber** encompasses plant-based polysaccharides and oligosaccharides that are indigestible by human small intestinal enzymes, classified as:
>
> - **Soluble fiber:** Dissolves in water forming viscous gels (pectins, beta-glucans, inulin). Slows gastric emptying, attenuates postprandial glycemic response, and reduces LDL cholesterol reabsorption via bile acid micelle formation.
> - **Insoluble fiber:** Increases fecal bulk and accelerates intestinal transit (cellulose, hemicellulose, lignin), reducing colonic mucosa exposure to potentially genotoxic metabolites.
>
> **Recommendation:** 25–38 g/day based on sex and body weight (Academy of Nutrition and Dietetics). In a sports context, adequate fiber intake supports microbiome health, inflammatory modulation, and body composition optimization.

---

### 3.5 Grasas Trans / Trans Fats

**ES — Español**

> Las **grasas trans** son ácidos grasos insaturados con al menos un doble enlace en configuración *trans* (hidrógenos en lados opuestos del doble enlace), en contraposición a la configuración *cis* natural. Se producen principalmente por:
>
> 1. **Hidrogenación parcial industrial:** Proceso tecnológico que solidifica aceites vegetales, generando ácido elaídico (18:1 trans-9). Asociado con disfunción endotelial, incremento de LDL, reducción de HDL y riesgo cardiovascular aumentado.
> 2. **Origen ruminal (CLA):** El ácido linoleico conjugado (CLA, *trans*-11) producido en rumiantes posee un perfil de evidencia diferente, con potencial efecto anticarcinogénico.
>
> **Límite recomendado:** La OMS establece una meta de eliminación de grasas trans industriales. En este sistema, el límite máximo tracking es **< 2 g/día**.

**EN — English**

> **Trans fats** are unsaturated fatty acids with at least one double bond in the *trans* configuration (hydrogen atoms on opposite sides), as opposed to the natural *cis* configuration. They arise primarily from:
>
> 1. **Industrial partial hydrogenation:** A process that solidifies vegetable oils, generating elaidic acid (18:1 trans-9). Strongly associated with endothelial dysfunction, elevated LDL, reduced HDL, and increased cardiovascular risk.
> 2. **Ruminant-derived (CLA):** Conjugated linoleic acid (CLA, *trans*-11) produced in ruminants has a distinct evidence profile, with potential anticarcinogenic properties.
>
> **Recommended limit:** The WHO mandates elimination of industrial trans fats globally. In this system, the maximum tracked threshold is **< 2 g/day**.

---

### 3.6 Volumen de Entrenamiento / Training Volume

**ES — Español**

> El **volumen de entrenamiento** es la cantidad total de trabajo mecánico acumulado en un período determinado, operacionalizado como:
>
> **Volumen = Series × Repeticiones × Carga (kg)**
>
> Sin embargo, en la literatura de hipertrofia moderna (Israetel, Krieger, Schoenfeld), el **número de series efectivas por músculo por semana** es el indicador operativo más práctico y predictivo de adaptación hipertrófica.
>
> **Rangos validados por la investigación:**
> - **Volumen mínimo efectivo (MEV):** ~8–10 series/músculo/semana
> - **Volumen de mantenimiento (MV):** ~6–8 series/músculo/semana
> - **Volumen de máxima adaptación (MAV):** ~12–20 series/músculo/semana
> - **Volumen máximo recuperable (MRV):** > 20 series/músculo/semana (rendimientos decrecientes, riesgo de sobreentrenamiento)
>
> **Limitación de 20 series semanales en este sistema:** Actúa como límite de MRV, previniendo la fatiga sistémica acumulada que compromete la recuperación y el sueño.

**EN — English**

> **Training volume** is the total accumulated mechanical work over a given period, operationalized as:
>
> **Volume = Sets × Reps × Load (kg)**
>
> However, in modern hypertrophy literature (Israetel, Krieger, Schoenfeld), **weekly effective sets per muscle group** is the most practical and predictive indicator of hypertrophic adaptation.
>
> **Research-validated ranges:**
> - **Minimum Effective Volume (MEV):** ~8–10 sets/muscle/week
> - **Maintenance Volume (MV):** ~6–8 sets/muscle/week
> - **Maximum Adaptive Volume (MAV):** ~12–20 sets/muscle/week
> - **Maximum Recoverable Volume (MRV):** > 20 sets/muscle/week (diminishing returns, overreaching risk)
>
> **20-set weekly cap in this system:** Acts as the MRV limiter, preventing systemic accumulated fatigue that would compromise recovery and sleep quality.

---

## 4. `.cursorrules` — GOLDEN RULES FOR CURSOR

> Save as `.cursorrules` at the repository root.

```
# ═══════════════════════════════════════════════════════════════
# .cursorrules — HealthTech Ecosystem
# Version: 1.0.0
# ═══════════════════════════════════════════════════════════════

## LANGUAGE & CODE CONVENTIONS
- All code MUST be written in English: variable names, function names,
  class names, database identifiers, constants, enums, and comments.
- UI strings and user-facing text MUST use i18n keys (NEVER hardcode
  display text in components). Example: t('nutrition.clone_day_button')
- Use BCP-47 locale codes ('es', 'en', 'es-MX'). Default locale: 'es'.
- All i18n translation files live under /locales/{locale}/namespace.json.
- Add every new string to BOTH /locales/es/ and /locales/en/ simultaneously.

## ARCHITECTURE & PATTERNS
- Follow a strict Offline-First pattern: EVERY data mutation must:
  1. Write to IndexedDB (Dexie) FIRST.
  2. Enqueue in the syncQueue table.
  3. Update the TanStack Query cache optimistically.
  4. Attempt server sync; handle 409 conflicts gracefully.
- Never bypass the sync queue for user-generated data (logs, nutrition).
- Use networkMode: 'offlineFirst' on ALL TanStack Query hooks.
- Service Worker background sync tag: 'sync-pending-mutations' (constant).

## BIOMECHANICS — CALCULATION INTEGRITY
- Quad-focus variant REQUIRES: knee_travel_past_toe = TRUE
  and shin_angle_target_deg < 75° (knee over toes protocol).
- Glute-focus variant REQUIRES: knee_travel_past_toe = FALSE,
  shin angle ≥ 85° (near-vertical shin), hip_hinge_depth = 'deep'.
- NEVER swap quad/glute focus logic. Add a unit test for any function
  that derives focus from joint angles.
- Anthropometric compensation rule: if femur_length_cm > 48, apply
  +5° forward lean tolerance to squat variants (biomechanical necessity).
- Moment arm calculations must use SI units (meters, Newtons) internally;
  convert to display units only at the presentation layer.

## TRAINING VOLUME — ENFORCEMENT
- The 20-set/week per-muscle-group cap is a HARD business rule.
  Enforce it at THREE layers:
  1. Database: weekly_volume_caps.cap_sets constraint.
  2. API: FastAPI endpoint must validate before inserting session_exercises.
  3. UI: Disable "add exercise" button and show warning when cap is reached.
- Never allow the weekly cap to be silently exceeded.
- Volume calculation: count sets by primary_muscle_group only (not secondary).

## NUTRITION — MICRO TRACKING
- Tracked micros list (all required on nutrition_log_entries):
  fiber_g, sugar_g, sodium_mg, saturated_fat_g, trans_fat_g.
- "Clone Day" feature: duplicate ALL nutrition_log_entries from a source
  log_date to the target log_date. Set cloned_from_log_id on the new record.
- "Base Meal" apply: copy base_meal_items to nutrition_log_entries;
  set base_meal_id reference. Allow post-apply editing without
  modifying the original base_meal.
- Computed nutrient columns on nutrition_log_entries are denormalized
  and recalculated on every insert/update (not at read time).

## FREEMIUM GATING
- Premium features: advanced biomechanics variants, Clone Day, Base Meals,
  detailed micro tracking, custom training plan builder.
- Free features: basic logging, default exercise catalog, macro tracking.
- Gate premium at the API layer (subscription_tier check in middleware).
- Also gate in UI with a consistent <PremiumGate> wrapper component.
- NEVER expose premium data in API responses for free users, even if
  the frontend would hide it.

## ACCESSIBILITY — WCAG AAA
- All interactive elements MUST have aria-label or visible text label.
- Color contrast ratio: minimum 7:1 for normal text (WCAG AAA).
- Form inputs: always pair <label> with input via htmlFor/id.
- Focus indicators: never remove outline; use a custom 3px solid ring.
- Motion: wrap all CSS animations in @media (prefers-reduced-motion: reduce).
- Touch targets: minimum 48×48px (WCAG 2.5.5 AAA).
- All images: alt text required; decorative images use alt="".

## SYNC & CONFLICT RESOLUTION
- Conflict resolution strategy: "Last Write Wins" by default,
  using updated_at timestamp comparison.
- On 409 from server: store conflict_data in syncQueue entry,
  surface a ConflictResolutionDialog in the UI for user choice.
- client_id: generated once per device/browser session; stored in
  localStorage. Format: UUID v4.
- local_version: increment by 1 on every local mutation.
- Never delete from syncQueue; mark as 'synced' or 'failed' for audit.

## DATABASE & API
- All timestamps: TIMESTAMPTZ (UTC). Never use plain TIMESTAMP.
- Soft deletes ONLY: use deleted_at column, never hard DELETE.
- All UUIDs: gen_random_uuid() (PostgreSQL) / crypto.randomUUID() (client).
- FastAPI routes: use async/await throughout; no synchronous DB calls.
- Pydantic models: explicit field validators for all business rules
  (e.g., rep_range_min < rep_range_max, rir 0–4 range).
- API versioning prefix: /api/v1/

## TESTING REQUIREMENTS
- Unit tests required for: volume cap enforcement, biomechanical focus
  derivation, macro/micro calculation, Clone Day logic.
- Integration tests required for: sync queue flush, conflict resolution,
  offline → online transition flow.
- Accessibility: run axe-core in CI on all page components.
- Test file location: __tests__/ mirroring src/ directory structure.

## SECURITY
- Never expose Supabase service_role key to the client.
- All API endpoints: JWT authentication via Supabase Auth.
- User data isolation: every query MUST filter by user_id = current_user.id.
- Input sanitization: strip HTML from all text fields before storage.
- Rate limiting: 100 req/min per user on sync endpoints.

## CODE QUALITY
- No any type in TypeScript (use unknown and type guards instead).
- Functions > 40 lines should be refactored.
- No magic numbers: define named constants for all biomechanical thresholds,
  volume caps, and nutrition limits.
- ESLint + Prettier enforced in CI; PRs with lint errors are blocked.
- Commit convention: Conventional Commits (feat:, fix:, docs:, refactor:).
```

---

## APPENDIX — Quick Reference

### Volume Cap Logic (TypeScript)

```typescript
// lib/training/volume-cap.ts

const MAX_WEEKLY_SETS_PER_MUSCLE = 20 as const;

export async function assertVolumeCapNotExceeded(
  userId: string,
  planId: string,
  muscleGroupId: number,
  weekNumber: number,
  additionalSets: number,
): Promise<void> {
  const current = await db.weeklyVolumeCaps.findUnique({
    where: { userId_planId_muscleGroupId_weekNumber: {
      userId, planId, muscleGroupId, weekNumber
    }}
  });

  const currentSets = current?.totalSets ?? 0;

  if (currentSets + additionalSets > MAX_WEEKLY_SETS_PER_MUSCLE) {
    throw new VolumeCapExceededError(
      `Adding ${additionalSets} sets would exceed the ${MAX_WEEKLY_SETS_PER_MUSCLE}-set ` +
      `weekly cap for this muscle group. Current: ${currentSets} sets.`
    );
  }
}
```

### Biomechanical Focus Selector (TypeScript)

```typescript
// lib/biomechanics/focus-selector.ts

export type ExerciseFocus = 'quad_focus' | 'glute_focus' | 'neutral';

interface FocusCriteria {
  kneeTravelPastToe: boolean;
  shinAngleDeg: number;
  hipHingeDepth: 'minimal' | 'moderate' | 'deep';
}

export function deriveExerciseFocus(criteria: FocusCriteria): ExerciseFocus {
  const { kneeTravelPastToe, shinAngleDeg, hipHingeDepth } = criteria;

  if (kneeTravelPastToe && shinAngleDeg < 75) {
    return 'quad_focus';
  }

  if (!kneeTravelPastToe && shinAngleDeg >= 85 && hipHingeDepth === 'deep') {
    return 'glute_focus';
  }

  return 'neutral';
}

// Femur compensation for biomechanical necessity
export function applyFemurCompensation(
  shinAngleDeg: number,
  femurLengthCm: number,
): number {
  const FEMUR_COMPENSATION_THRESHOLD_CM = 48;
  const COMPENSATION_DEGREES            = 5;

  if (femurLengthCm > FEMUR_COMPENSATION_THRESHOLD_CM) {
    return shinAngleDeg + COMPENSATION_DEGREES;
  }
  return shinAngleDeg;
}
```

### Clone Day Implementation (TypeScript)

```typescript
// lib/nutrition/clone-day.service.ts

export async function cloneNutritionDay(
  userId: string,
  sourceDateISO: string,
  targetDateISO: string,
): Promise<NutritionLog> {
  const sourceLog = await localDb.nutritionLogs
    .where({ userId, logDate: sourceDateISO })
    .first();

  if (!sourceLog) {
    throw new NotFoundError(`No nutrition log found for ${sourceDateISO}`);
  }

  const sourceEntries = await localDb.nutritionLogEntries
    .where('logId').equals(sourceLog.id)
    .toArray();

  const newLog: LocalNutritionLog = {
    id:                crypto.randomUUID(),
    userId,
    logDate:           targetDateISO,
    clonedFromLogId:   sourceLog.id,
    notes:             null,
    clientId:          generateClientId(),
    syncStatus:        'pending',
    localVersion:      1,
    updatedAt:         new Date().toISOString(),
  };

  const newEntries = sourceEntries.map((entry) => ({
    ...entry,
    id:           crypto.randomUUID(),
    logId:        newLog.id,
    clientId:     generateClientId(),
    syncStatus:   'pending' as const,
    localVersion: 1,
    createdAt:    new Date().toISOString(),
  }));

  await localDb.transaction('rw', [localDb.nutritionLogs, localDb.nutritionLogEntries, localDb.syncQueue], async () => {
    await localDb.nutritionLogs.add(newLog);
    await localDb.nutritionLogEntries.bulkAdd(newEntries);
    await syncQueueService.enqueue({ entityType: 'nutrition_log', entityId: newLog.id, operation: 'create', payload: newLog });
  });

  return newLog;
}
```

---

*End of Architecture Document — HealthTech Ecosystem v1.0.0*