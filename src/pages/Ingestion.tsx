import { useState } from 'react'
import { db } from '../db/db'
import type { Recipe, Ingredient, RecipeIngredient } from '../db/types'
import { seedNorwegianIngredients } from '../data/norwegianIngredients'
import Button from '../components/ui/Button'

// ── JSON import ───────────────────────────────────────────────────────────────

interface ImportedIngredient {
  raw_text?: string
  quantity?: number
  unit?: string
  ingredient_name?: string
  category?: string
  optional?: boolean
}

interface ImportedRecipe {
  title: string
  description?: string
  default_servings?: number
  prep_time_min?: number
  cook_time_min?: number
  instructions?: string
  tags?: string[]
  status?: string
  source_reference?: string
  ingredients?: ImportedIngredient[]
}

interface ImportPreview {
  valid: ImportedRecipe[]
  errors: string[]
}

function validateImport(raw: unknown): ImportPreview {
  const errors: string[] = []
  const valid: ImportedRecipe[] = []

  const arr = Array.isArray(raw) ? raw : [raw]
  arr.forEach((item: unknown, i) => {
    if (typeof item !== 'object' || item === null) {
      errors.push(`Item ${i + 1}: not an object`)
      return
    }
    const r = item as Record<string, unknown>
    if (typeof r.title !== 'string' || !r.title.trim()) {
      errors.push(`Item ${i + 1}: missing "title"`)
      return
    }
    valid.push(r as unknown as ImportedRecipe)
  })

  return { valid, errors }
}

async function findOrCreateIngredient(name: string): Promise<number> {
  const canonical = name.trim()
  const normalized = canonical.toLowerCase().replace(/\s+/g, ' ').trim()
  const existing = await db.ingredients.where('normalized_name').equals(normalized).first()
  if (existing?.ingredient_id != null) return existing.ingredient_id
  return db.ingredients.add({ canonical_name: canonical, normalized_name: normalized } as Ingredient)
}

async function importRecipes(recipes: ImportedRecipe[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0
  const now = Date.now()

  for (const r of recipes) {
    const existing = await db.recipes.where('title').equals(r.title.trim()).first()
    if (existing) { skipped++; continue }

    const recipeId = await db.recipes.add({
      title: r.title.trim(),
      description: r.description?.trim() || undefined,
      default_servings: r.default_servings ?? 2,
      prep_time_min: r.prep_time_min,
      cook_time_min: r.cook_time_min,
      total_time_min: (r.prep_time_min != null && r.cook_time_min != null) ? r.prep_time_min + r.cook_time_min : undefined,
      instructions: r.instructions?.trim() || undefined,
      tags: r.tags ?? [],
      status: (['draft', 'review', 'active', 'archived'].includes(r.status ?? '') ? r.status : 'draft') as Recipe['status'],
      source_type: 'import',
      source_reference: r.source_reference,
      created_at: now,
      updated_at: now,
    } as Recipe)

    if (r.ingredients && r.ingredients.length > 0) {
      for (const ing of r.ingredients) {
        const name = ing.ingredient_name?.trim() || ing.raw_text?.trim()
        if (!name) continue
        const ingredientId = await findOrCreateIngredient(name)
        if (ing.category?.trim()) {
          await db.ingredients.update(ingredientId, { category: ing.category.trim() })
        }
        await db.recipeIngredients.add({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          raw_text: ing.raw_text?.trim() || name,
          quantity: ing.quantity,
          unit: ing.unit?.trim() || undefined,
          optional_flag: ing.optional ?? false,
        } as RecipeIngredient)
      }
    }

    imported++
  }

  return { imported, skipped }
}

// ── Export ────────────────────────────────────────────────────────────────────

async function exportAll() {
  const [recipes, recipeIngredients, ingredients] = await Promise.all([
    db.recipes.toArray(),
    db.recipeIngredients.toArray(),
    db.ingredients.toArray(),
  ])

  const ingMap = new Map(ingredients.map(i => [i.ingredient_id!, i]))

  const exported = recipes.map(r => ({
    ...r,
    ingredients: recipeIngredients
      .filter(ri => ri.recipe_id === r.recipe_id)
      .map(ri => ({
        raw_text: ri.raw_text,
        quantity: ri.quantity,
        unit: ri.unit,
        ingredient_name: ingMap.get(ri.ingredient_id)?.canonical_name,
        category: ingMap.get(ri.ingredient_id)?.category,
        optional: ri.optional_flag,
      })),
  }))

  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `meal-planner-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── JSONImportTab ─────────────────────────────────────────────────────────────

function JSONImportTab() {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [importing, setImporting] = useState(false)

  function parsePreview() {
    setResult(null)
    try {
      const parsed = JSON.parse(text)
      setPreview(validateImport(parsed))
    } catch (e) {
      setPreview({ valid: [], errors: [`JSON parse error: ${String(e)}`] })
    }
  }

  async function doImport() {
    if (!preview || preview.valid.length === 0) return
    setImporting(true)
    try {
      const res = await importRecipes(preview.valid)
      setResult(res)
      setText('')
      setPreview(null)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Paste JSON (single recipe object or array of recipes)
        </label>
        <textarea
          className="w-full h-52 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder={'[\n  {\n    "title": "Pasta Bolognese",\n    "default_servings": 4,\n    "status": "active",\n    "tags": ["pasta", "meat"],\n    "ingredients": [\n      { "raw_text": "500g minced beef", "ingredient_name": "minced beef", "category": "Meat" }\n    ]\n  }\n]'}
          value={text}
          onChange={e => { setText(e.target.value); setPreview(null); setResult(null) }}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={parsePreview} disabled={!text.trim()}>Preview</Button>
        {preview && preview.valid.length > 0 && (
          <Button onClick={doImport} disabled={importing}>
            {importing ? 'Importing…' : `Import ${preview.valid.length} recipe${preview.valid.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </div>

      {preview && (
        <div className="space-y-2">
          {preview.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-1">
              {preview.errors.map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
            </div>
          )}
          {preview.valid.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-xs font-medium text-green-800 mb-2">{preview.valid.length} valid recipe{preview.valid.length !== 1 ? 's' : ''} ready to import:</p>
              <ul className="space-y-1">
                {preview.valid.map((r, i) => (
                  <li key={i} className="text-xs text-green-700">
                    <strong>{r.title}</strong>
                    {r.ingredients ? ` — ${r.ingredients.length} ingredient${r.ingredients.length !== 1 ? 's' : ''}` : ''}
                    {r.status ? ` — ${r.status}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            Done — <strong>{result.imported}</strong> recipe{result.imported !== 1 ? 's' : ''} imported,{' '}
            <strong>{result.skipped}</strong> skipped (duplicate title).
          </p>
        </div>
      )}
    </div>
  )
}

// ── ExportTab ─────────────────────────────────────────────────────────────────

function ExportTab() {
  const [done, setDone] = useState(false)
  async function doExport() { await exportAll(); setDone(true); setTimeout(() => setDone(false), 3000) }
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Export all recipes (including ingredients) as a JSON file. Use this to back up your data or transfer it to another browser.
      </p>
      <Button onClick={doExport}>{done ? 'Downloaded!' : 'Export all recipes'}</Button>
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-500 space-y-1">
        <p>The exported file can be re-imported using the JSON import tab. Duplicate recipes (same title) are skipped on import.</p>
        <p>Your data is stored locally in your browser (IndexedDB). Export regularly to avoid data loss from browser storage clearing.</p>
      </div>
    </div>
  )
}

// ── Ingestion (main) ──────────────────────────────────────────────────────────

// ── SeedTab ───────────────────────────────────────────────────────────────────

function SeedTab() {
  const [status, setStatus] = useState<{ added: number; skipped: number } | null>(null)
  const [loading, setLoading] = useState(false)

  async function doSeed() {
    setLoading(true)
    try {
      const result = await seedNorwegianIngredients()
      setStatus(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Load the Norwegian ingredient library into the database. This pre-populates ~170 common Norwegian ingredients
        with canonical names, normalized forms, ingredient families, and shopping categories.
      </p>
      <p className="text-sm text-gray-600">
        The recommendation engine uses <strong>normalized names</strong> and <strong>ingredient families</strong> to
        detect overlap between recipes at three levels:
      </p>
      <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
        <li><strong>Exact</strong> — same ingredient (e.g. <em>løk</em> in two recipes) — full credit</li>
        <li><strong>Normalized</strong> — different form of the same ingredient (e.g. <em>rødløk</em> vs <em>gul løk</em>, both normalize to <em>løk</em>) — 80% credit</li>
        <li><strong>Family</strong> — same culinary family (e.g. <em>brokkoli</em> vs <em>blomkål</em>, both <em>kålvekst</em>) — 40% credit</li>
      </ul>
      <p className="text-sm text-gray-500">
        Already-seeded ingredients are skipped. Safe to run multiple times.
      </p>
      <Button onClick={doSeed} disabled={loading}>
        {loading ? 'Seeding…' : 'Seed Norwegian ingredient library'}
      </Button>
      {status && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            Done — <strong>{status.added}</strong> ingredients added, <strong>{status.skipped}</strong> already existed.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Ingestion (main) ──────────────────────────────────────────────────────────

type Tab = 'seed' | 'import' | 'export'

export default function Ingestion() {
  const [tab, setTab] = useState<Tab>('seed')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'seed', label: 'Norwegian ingredients' },
    { id: 'import', label: 'JSON Import' },
    { id: 'export', label: 'Export' },
  ]

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Import / Export</h2>

      <div className="flex border-b border-gray-200 gap-0 mb-5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'seed'   && <SeedTab />}
      {tab === 'import' && <JSONImportTab />}
      {tab === 'export' && <ExportTab />}

      {/* JSON schema reference */}
      <div className="mt-8 border-t border-gray-200 pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">JSON Schema Reference</p>
        <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-700 overflow-auto">{`[
  {
    "title": "string (required)",
    "description": "string",
    "default_servings": 2,
    "prep_time_min": 15,
    "cook_time_min": 30,
    "instructions": "string",
    "tags": ["pasta", "vegetarian"],
    "status": "draft | review | active | archived",
    "source_reference": "string",
    "ingredients": [
      {
        "raw_text": "2 cups all-purpose flour",
        "quantity": 2,
        "unit": "cups",
        "ingredient_name": "all-purpose flour",
        "category": "Grains",
        "optional": false
      }
    ]
  }
]`}</pre>
      </div>
    </div>
  )
}
