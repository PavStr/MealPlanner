# Meal Planner

Personal weekly dinner planning app. Goal: **less work — in the shop and in the kitchen.**

Stores a recipe library in your browser, recommends recipes that share ingredients with what you're already cooking, flags where you can consolidate ingredients across recipes, and generates a tidy shopping list and batch-prep plan.

Deployed as a static site on GitHub Pages. All data lives in your browser (IndexedDB) — no server, no account.

---

## Features

- **Recipe library** — Add, edit, and organise recipes with structured ingredients, tags, and status
- **Plan Builder** — Pick 1–4 anchor recipes; the engine ranks every other active recipe by ingredient overlap and returns the top 3 suggestions
- **Ingredient consolidation** — On the shopping list, the app detects when two recipes call for interchangeable ingredients (e.g. shallot vs yellow onion) and suggests using just one throughout — fewer items to buy
- **Shopping list** — Consolidated by category with per-recipe breakdown
- **Prep plan** — Spots ingredients shared across multiple recipes so you can prep once
- **JSON import / export** — Bulk-import recipes from GPT or a JSON file; export for backup
- **MISKG-linked ingredient library** — ~170 ingredients linked to the MISKG food dataset for substitution data (nutrition and flavour pairing ready for Phase 2)

---

## Local development

Requires Node.js 18+.

```bash
npm install
npm run dev        # dev server at http://localhost:5173/MealPlanner/
npm run build      # type-check + production build → dist/
npm run preview    # preview the production build locally
```

---

## Deploying to GitHub Pages

1. Push this repository to GitHub as `MealPlanner` (or update `base` in `vite.config.ts` to match your repo name)
2. In GitHub → Settings → Pages → set **Source** to **GitHub Actions**
3. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys automatically
4. Live at `https://<your-username>.github.io/MealPlanner/`

> If your repo has a different name, edit the `base` field in `vite.config.ts`.

---

## Quick start

### 1 — Seed the ingredient library

Go to **Import / Export → Ingredient library → Seed ingredient library**.

This loads ~170 ingredients into the database with English canonical names, ingredient families, and MISKG IDs. Do this once. It powers:
- **Similarity matching** in the recommendation engine (exact / normalised / family levels)
- **Substitution detection** on the shopping list (e.g. shallot ↔ yellow onion)

### 2 — Add recipes

**Option A — GPT import (recommended):** Take a photo or PDF of a recipe → open `GPT_RECIPE_GUIDE.md` → copy the system prompt → give it to ChatGPT or Claude with your recipe → copy the JSON → Import / Export → JSON Import → paste → Preview → Import.

**Option B — Manual entry:** Recipe Library → Add Recipe. Use the canonical English ingredient name (e.g. `chicken`, not `boneless skinless chicken breast`). The ingredient lookup matches against the seeded library.

**Option C — JSON file:** Prepare a file following the schema below and import in bulk.

### 3 — Build a weekly plan

1. Go to **Plan Builder**
2. Set target meals and servings
3. Search and select up to 4 anchor recipes
4. Click **Get Recommendations** — returns the 3 best-matching active recipes ranked by ingredient reuse
5. Toggle suggestions on/off, click **Save Plan**

### 4 — Review the plan

**Plan Summary** has three tabs:

| Tab | What it shows |
|---|---|
| Overview | All recipes in the plan with their roles |
| Shopping List | Categorised ingredient list + **consolidation suggestions** |
| Prep Plan | Ingredients shared across ≥2 recipes — prep once |

The **consolidation panel** (amber banner, Shopping List tab) tells you when two different ingredients in your plan are interchangeable according to MISKG substitution data. Example: if 3 recipes use shallot and 1 uses yellow onion, it suggests using shallot for all — one fewer item to buy.

---

## Recipe JSON format

Used for both import and export. Full schema in `GPT_RECIPE_GUIDE.md`.

```json
[
  {
    "title": "Pasta Bolognese",
    "description": "Classic beef ragù with pasta",
    "default_servings": 4,
    "prep_time_min": 15,
    "cook_time_min": 45,
    "status": "active",
    "tags": ["pasta", "beef", "weeknight"],
    "source_reference": "Home recipe",
    "instructions": "1. Sauté onion and garlic...",
    "ingredients": [
      {
        "raw_text": "1 yellow onion, finely chopped",
        "quantity": 1,
        "unit": "piece",
        "ingredient_name": "onion",
        "category": "Vegetables"
      },
      {
        "raw_text": "2 cloves garlic",
        "quantity": 2,
        "unit": "clove",
        "ingredient_name": "garlic",
        "category": "Vegetables"
      },
      {
        "raw_text": "500 g ground beef",
        "quantity": 500,
        "unit": "g",
        "ingredient_name": "ground beef",
        "category": "Meat & Fish"
      }
    ]
  }
]
```

### Status values

| Value | Meaning |
|---|---|
| `draft` | Work in progress — excluded from recommendations |
| `review` | Ready to check before activating |
| `active` | Included in recommendation pool |
| `archived` | Kept for reference — excluded from recommendations |

Only `active` recipes appear in Plan Builder.

---

## Recommendation engine

Scores every active recipe not in the current selection on three dimensions:

| Dimension | Weight | Detail |
|---|---|---|
| Ingredient reuse | 60 % | Rewards overlap at exact, normalised, and family level; penalises new ingredient types |
| Cost | 15 % | Placeholder — not yet implemented |
| Nutrition | 25 % | Calories, protein, fat, carbs, fibre from MISKG/Edamam data — rewards recipes that complement the nutritional profile of the anchors |

### Ingredient similarity levels

| Level | Example | Score |
|---|---|---|
| Exact | `onion` in two recipes | 1.0 |
| Normalised | `red onion` vs `yellow onion` (both normalise to `onion`) | 0.8 |
| Family | `broccoli` vs `cauliflower` (both `brassica`) | 0.4 |

Weights are defined in `src/data/ingredientLibrary.ts → SIMILARITY_WEIGHTS` and imported by the recommender — one place to tune.

---

## MISKG integration

The ingredient library links each ingredient to the [MISKG dataset](https://github.com/kanak8278/MISKG) via a `miskg_id` field stored in IndexedDB.

### What's active

**Substitution pairs** — pre-filtered from MISKG's `substitution_pairs.json` to the ~170 seeded ingredients (1 515 unique pairs). Used at runtime in Plan Summary to generate consolidation suggestions. Baked into `src/data/substitutionPairs.ts` at build time — no external requests.

**Nutrition scoring** — calorie, protein, fat, carbs, and fibre values extracted from `edamam.json` and baked into `src/data/nutritionData.ts` (covers 142 of the ~170 seeded ingredients). The `engine/nutrition.ts` module converts recipe ingredients to per-recipe totals and produces a score that feeds the 25 % nutrition weight in recommendations.

### What's ready to wire up (future)

| MISKG file | Powers |
|---|---|
| `src/data/DB/ingredient_to_flavordb.json` | Flavour-pairing hints — could surface in Plan Builder alongside ingredient overlap |
| `src/data/DB/conceptnet.json` | Semantic ingredient relationships — could improve family-level matching |

The `RecipeCost` table already exists in the DB schema, waiting for data.

---

## Data storage

Everything is stored in **IndexedDB** under the database name `MealPlannerDB`. Data persists across refreshes but is tied to your browser profile.

**Back up regularly:** Import / Export → Export → saves a dated JSON file you can re-import on any browser.

---

## Project structure

```
src/
  db/
    types.ts              — TypeScript interfaces for all entities
    db.ts                 — Dexie (IndexedDB) schema, 9 tables, version-tracked
  engine/
    recommender.ts        — Three-level weighted recommendation scoring
    shoppingList.ts       — Shopping list, prep plan, consolidation suggestions
    nutrition.ts          — Per-recipe nutrition totals and recommendation score
  data/
    ingredientLibrary.ts  — ~170 English ingredients with families, MISKG IDs, seeder
    substitutionPairs.ts  — 1 515 pre-filtered MISKG substitution pairs (build-time)
    nutritionData.ts      — Per-ingredient kcal/protein/fat/carbs/fibre from edamam (142 ingredients)
    DB/                   — Raw MISKG dataset files (not bundled)
  components/
    layout/               — Sidebar, Layout wrapper
    ui/                   — Button, Badge, Modal
  pages/
    RecipeLibrary.tsx     — CRUD + ingredient entry
    PlanBuilder.tsx       — Anchor selection + recommendations
    PlanSummary.tsx       — Overview / Shopping list / Prep plan tabs
    Ingestion.tsx         — JSON import/export + ingredient seeder
```
