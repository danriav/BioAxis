# 🧬 BioAxis
**Biometric Precision and High-Compute Nutrition Platform**

BioAxis is a high-performance HealthTech platform engineered to optimize human biomechanics and nutrition through a data-driven ecosystem. Designed for uncompromising accuracy, BioAxis replaces generic health tracking with biometric precision, high-compute nutrition analysis, and secure real-time data synchronization.

---

## 🏗️ Technical Architecture

BioAxis leverages a robust, hybrid microservices architecture separating high-speed presentation from intensive computational logic:

- **Frontend Edge (Next.js 16)**: A modern, highly reactive user interface utilizing the Next.js App Router. Enhanced with `framer-motion` for fluid micro-interactions and Tailwind CSS v4 for absolute styling control. *(Note: Upgraded from v14 for enhanced performance).*
- **High-Compute Backend (FastAPI)**: A specialized Python microservice dedicated to complex logic, serving as the "BioAxis Nutrition Engine." It handles rapid data ingestion, complex model validation via Pydantic, and low-latency API responses.
- **CORS & Security Policies**: Explicitly configured for strict local ecosystem communication (`http://localhost:3000` and `http://127.0.0.1:3000`).

---

## 🔬 Core Module: Nutritional Bio-Explorer

The **Nutritional Bio-Explorer** represents a paradigm shift in dietary tracking. Instead of relying on rigid, pre-defined portions, the engine processes all nutritional vectors at an atomic level:

- **1-Gram Normalization**: All macronutrients and crucial micronutrients (e.g., Potassium `potassium_mg_per_g`, Vitamin C `vitamin_c_mg_per_g`) are normalized to a 1g-unit scale in the PostgreSQL database.
- **Compute Offloading**: Transitioning from a reactive TypeScript frontend to a high-compute Python backend ensures that complex dietary extrapolations and cross-day synchronization (`/nutrition/sync-day`) occur with zero UI blocking.

---

## 🛡️ Security & Data Integrity

Biometric data requires military-grade isolation. BioAxis employs:
- **Supabase SSR Auth**: Secure, server-side rendered authentication flows (`@supabase/ssr`).
- **PostgreSQL RLS (Row Level Security)**: Enforced policies at the database layer to guarantee strict data isolation. No user can access or mutate biometric vectors or meal logs outside of their authenticated identity.

---

## 🤖 AI-Augmented Development

The BioAxis ecosystem is actively developed using an **Agentic Workflow**. Utilizing advanced LLMs alongside **Antigravity terminals**, we achieve real-time logic synthesis, automated security auditing, and rapid iterative prototyping. This AI-augmented pipeline accelerates deployment without sacrificing architectural integrity.

---

## 🧬 Data Engineering: USDA-Aligned Seeding

Nutrition models demand pristine data sources. BioAxis utilizes a standardized data ingestion pipeline:
- **`seed_foods.py`**: A dedicated data engineering script that interfaces directly with Supabase to inject USDA-aligned, 1g-normalized food profiles.
- **Idempotent Upserts**: The engine uses non-destructive `.upsert()` operations locked to specific conflict vectors (`name_es, variant`), ensuring database integrity without purging existing primary keys.

---

## 🚀 Setup & Deployment

BioAxis utilizes a complete Dockerized workflow for an identical Dev-to-Prod parity. 

### 1. Environment Configuration
Create the following `.env` files based on this template (DO NOT commit real keys):

**Frontend (`frontend/.env.local`) & Backend (`backend/.env`)**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
```

### 2. Infrastructure Initialization
Run the orchestration command from the root directory to build and spin up the microservices:

```bash
docker-compose up -d --build
```

### 3. Initialize the Bio-Base
Execute the data engineering script to inject the 1g-normalized nutritional catalog:

```bash
docker-compose exec backend python app/seed_foods.py
```

### Access Points
- **Web Platform**: `http://localhost:3000`
- **Engine API (Swagger)**: `http://localhost:8000/docs`
