# Meal Planner

Personal weekly dinner planning app. Stores a recipe library in the browser, recommends complementary recipes that minimise new shopping trips, and generates consolidated shopping lists and batch prep plans.

Deployed as a static site on GitHub Pages. All data lives in your browser (IndexedDB) — no server, no account needed.

---

## Features

- **Recipe library** — Add, edit, and organise recipes with structured ingredients, tags, and status
- **Plan Builder** — Select 1–4 anchor recipes, get 3 ranked complementary suggestions based on ingredient overlap, then save the week's plan
- **Shopping list** — Consolidated by ingredient category, with per-recipe breakdown
- **Prep plan** — Identifies ingredients shared across recipes so you can batch-prep once
- **JSON import / export** — Bulk-import recipes from a JSON file; export everything for backup
- **GPT ingestion workflow** — Use `GPT_RECIPE_GUIDE.md` to extract recipes from photos or PDFs and get correctly formatted JSON ready to import

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

1. Push this repository to GitHub as `MealPlanner` (or update `base` in `vite.config.ts` to match your actual repo name)
2. In GitHub → Settings → Pages → set **Source** to **GitHub Actions**
3. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys automatically
4. Your app will be live at `https://<your-username>.github.io/MealPlanner/`

> If your repository has a different name, edit the `base` field in `vite.config.ts` to `/your-repo-name/`.

---

## Quick start

### 1 — Seed the Norwegian ingredient library

Go to **Import Recipes → Seed Norwegian ingredients**. This pre-loads ~120 common Norwegian ingredients with canonical names, ingredient families, and shopping categories. Doing this once means the recommendation engine can match similar ingredients (e.g. `rød paprika` and `gul paprika` both count as `paprika`).

### 2 — Add recipes

**Option A — Manual entry:** Recipe Library → Add Recipe. Fill in metadata and add ingredient rows. Use the "Ingredient name" column for the canonical form (e.g. `kylling`, not `kyllingfilet med skinn`).

**Option B — GPT import:** Take a photo or PDF of a recipe → give it to GPT along with `GPT_RECIPE_GUIDE.md` → copy the JSON output → Import Recipes → JSON Import → paste → Preview → Import.

**Option C — JSON file:** Prepare a JSON file following the schema below and import it in bulk.

### 3 — Build a weekly plan

1. Go to **Plan Builder**
2. Set target meals (default 4) and servings (default 2)
3. Search and click recipes to select as anchors (up to 4)
4. Click **Get Recommendations** — the engine ranks all active recipes not yet selected by ingredient reuse, and returns the top 3
5. Toggle which suggestions to add to the plan
6. Click **Save Plan**

### 4 — Review summary

Plan Summary shows the full recipe list, a categorised shopping list, and a batch prep plan identifying shared ingredient prep steps.

---

## Recipe JSON format

Used for both import and export. The full schema is documented in `GPT_RECIPE_GUIDE.md`.

```json
[
  {
    "title": "Pasta Bolognese",
    "description": "Klassisk italiensk kjøttsaus",
    "default_servings": 4,
    "prep_time_min": 15,
    "cook_time_min": 45,
    "status": "active",
    "tags": ["pasta", "kjøtt", "hverdagsmat"],
    "source_reference": "Hjemmelaget oppskrift",
    "instructions": "1. Fres løk og hvitløk...",
    "ingredients": [
      {
        "raw_text": "1 gul løk, finhakket",
        "quantity": 1,
        "unit": "stk",
        "ingredient_name": "løk",
        "category": "Grønnsaker"
      },
      {
        "raw_text": "2 fedd hvitløk",
        "quantity": 2,
        "unit": "fedd",
        "ingredient_name": "hvitløk",
        "category": "Grønnsaker"
      },
      {
        "raw_text": "500 g kjøttdeig",
        "quantity": 500,
        "unit": "g",
        "ingredient_name": "kjøttdeig",
        "category": "Kjøtt og fisk"
      }
    ]
  }
]
```

### Status values

| Value | Meaning |
|---|---|
| `draft` | Work in progress, not used in recommendations |
| `review` | Ready to check before activating |
| `active` | Included in recommendation pool |
| `archived` | Kept for reference, excluded from recommendations |

Only `active` recipes appear in Plan Builder and recommendations.

---

## Recommendation engine

Scores candidate recipes on three weighted dimensions:

| Dimension | Weight | Detail |
|---|---|---|
| Ingredient reuse | 60 % | Rewards exact, normalized, and family-level overlap; penalises new ingredient types |
| Cost | 15 % | Placeholder — Phase 2 |
| Nutrition | 25 % | Placeholder — Phase 2 |

### Ingredient similarity levels

| Level | Example | Reuse credit |
|---|---|---|
| Exact | `løk` used in two recipes | 1.0 |
| Normalized | `rødløk` vs `gul løk` (both normalize to `løk`) | 0.8 |
| Family | `brokkoli` vs `blomkål` (both `kålvekst`) | 0.4 |

Seeding the Norwegian ingredient library establishes the normalized names and families that power these comparisons.

---

## Data storage

Everything is stored in **IndexedDB** in your browser under the database name `MealPlannerDB`. Data persists across page refreshes but is tied to that browser profile.

**Back up regularly:** Import Recipes → Export → saves a dated JSON file. Re-import on a new browser by pasting or loading that file.

---

## Project structure

```
src/
  db/
    types.ts          — TypeScript interfaces for all entities
    db.ts             — Dexie (IndexedDB) schema, 9 tables
  engine/
    recommender.ts    — Weighted recommendation scoring
    shoppingList.ts   — Shopping list and prep plan generation
  data/
    norwegianIngredients.ts — ~120 Norwegian ingredients with families + seeder
  components/
    layout/           — Sidebar, Layout wrapper
    ui/               — Button, Badge, Modal
  pages/
    RecipeLibrary.tsx — CRUD + ingredient entry
    PlanBuilder.tsx   — Anchor selection + recommendations
    PlanSummary.tsx   — Shopping list + prep plan tabs
    Ingestion.tsx     — JSON import/export + ingredient seeder
```

---

## GPT recipe ingestion

See **`GPT_RECIPE_GUIDE.md`** for the complete guide including:
- System prompt to give GPT
- Full JSON schema with field explanations
- Norwegian ingredient canonical name reference
- Shopping category taxonomy
- Unit conversion reference (dl, ss, ts, stk)
- Four complete example recipes

Workflow:
1. Open `GPT_RECIPE_GUIDE.md` and copy the system prompt section
2. Start a new GPT session, paste the system prompt
3. Attach your recipe photo or PDF
4. GPT outputs JSON
5. Copy → Import Recipes → JSON Import → Preview → Import
