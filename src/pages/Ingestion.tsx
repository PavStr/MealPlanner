import { useState } from 'react'
import { db } from '../db/db'
import type { Recipe, RecipeIngredient } from '../db/types'
import {
  seedIngredientSimilarities,
  seedNorwegianIngredients,
} from '../data/ingredientLibrary'
import { resolveOrCreateIngredient } from '../data/ingredientResolver'
import { seedRecipeNutrition } from '../engine/nutrition'
import Button from '../components/ui/Button'
import SAMPLE_RECIPES_RAW from '../data/sampleRecipes.json'

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

    const recipe = item as Record<string, unknown>
    if (typeof recipe.title !== 'string' || !recipe.title.trim()) {
      errors.push(`Item ${i + 1}: missing "title"`)
      return
    }

    valid.push(recipe as unknown as ImportedRecipe)
  })

  return { valid, errors }
}

async function importRecipes(
  recipes: ImportedRecipe[],
): Promise<{ imported: number; skipped: number; recipeIds: number[] }> {
  let imported = 0
  let skipped = 0
  const now = Date.now()
  const recipeIds: number[] = []

  for (const recipe of recipes) {
    const existing = await db.recipes.where('title').equals(recipe.title.trim()).first()
    if (existing) {
      skipped++
      continue
    }

    const recipeId = await db.recipes.add({
      title: recipe.title.trim(),
      description: recipe.description?.trim() || undefined,
      default_servings: recipe.default_servings ?? 2,
      prep_time_min: recipe.prep_time_min,
      cook_time_min: recipe.cook_time_min,
      total_time_min:
        recipe.prep_time_min != null && recipe.cook_time_min != null
          ? recipe.prep_time_min + recipe.cook_time_min
          : undefined,
      instructions: recipe.instructions?.trim() || undefined,
      tags: recipe.tags ?? [],
      status: (
        ['draft', 'review', 'active', 'archived'].includes(recipe.status ?? '')
          ? recipe.status
          : 'draft'
      ) as Recipe['status'],
      source_type: 'import',
      source_reference: recipe.source_reference,
      created_at: now,
      updated_at: now,
    } as Recipe)

    recipeIds.push(recipeId)

    if (recipe.ingredients && recipe.ingredients.length > 0) {
      for (const ingredient of recipe.ingredients) {
        const name = ingredient.ingredient_name?.trim() || ingredient.raw_text?.trim()
        if (!name) continue

        const ingredientId = await resolveOrCreateIngredient(name)
        if (ingredient.category?.trim()) {
          await db.ingredients.update(ingredientId, { category: ingredient.category.trim() })
        }

        await db.recipeIngredients.add({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          raw_text: ingredient.raw_text?.trim() || name,
          quantity: ingredient.quantity,
          unit: ingredient.unit?.trim() || undefined,
          optional_flag: ingredient.optional ?? false,
        } as RecipeIngredient)
      }
    }

    imported++
  }

  return { imported, skipped, recipeIds }
}

async function exportAll() {
  const [recipes, recipeIngredients, ingredients] = await Promise.all([
    db.recipes.toArray(),
    db.recipeIngredients.toArray(),
    db.ingredients.toArray(),
  ])

  const ingredientMap = new Map(ingredients.map(ingredient => [ingredient.ingredient_id!, ingredient]))

  const exported = recipes.map(recipe => ({
    ...recipe,
    ingredients: recipeIngredients
      .filter(recipeIngredient => recipeIngredient.recipe_id === recipe.recipe_id)
      .map(recipeIngredient => ({
        raw_text: recipeIngredient.raw_text,
        quantity: recipeIngredient.quantity,
        unit: recipeIngredient.unit,
        ingredient_name: ingredientMap.get(recipeIngredient.ingredient_id)?.canonical_name,
        category: ingredientMap.get(recipeIngredient.ingredient_id)?.category,
        optional: recipeIngredient.optional_flag,
      })),
  }))

  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `meal-planner-export-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

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
    } catch (error) {
      setPreview({ valid: [], errors: [`JSON parse error: ${String(error)}`] })
    }
  }

  async function doImport() {
    if (!preview || preview.valid.length === 0) return

    setImporting(true)
    try {
      const res = await importRecipes(preview.valid)
      await seedRecipeNutrition(res.recipeIds)
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
          onChange={event => {
            setText(event.target.value)
            setPreview(null)
            setResult(null)
          }}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={parsePreview} disabled={!text.trim()}>
          Preview
        </Button>
        {preview && preview.valid.length > 0 && (
          <Button onClick={doImport} disabled={importing}>
            {importing ? 'Importing...' : `Import ${preview.valid.length} recipe${preview.valid.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </div>

      {preview && (
        <div className="space-y-2">
          {preview.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-1">
              {preview.errors.map((error, index) => (
                <p key={index} className="text-xs text-red-700">{error}</p>
              ))}
            </div>
          )}
          {preview.valid.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-xs font-medium text-green-800 mb-2">
                {preview.valid.length} valid recipe{preview.valid.length !== 1 ? 's' : ''} ready to import:
              </p>
              <ul className="space-y-1">
                {preview.valid.map((recipe, index) => (
                  <li key={index} className="text-xs text-green-700">
                    <strong>{recipe.title}</strong>
                    {recipe.ingredients ? ` - ${recipe.ingredients.length} ingredient${recipe.ingredients.length !== 1 ? 's' : ''}` : ''}
                    {recipe.status ? ` - ${recipe.status}` : ''}
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
            Imported <strong>{result.imported}</strong> recipe{result.imported !== 1 ? 's' : ''},{' '}
            <strong>{result.skipped}</strong> skipped as duplicates.
          </p>
        </div>
      )}
    </div>
  )
}

function ExportTab() {
  const [done, setDone] = useState(false)

  async function doExport() {
    await exportAll()
    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

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

function SeedTab() {
  const [status, setStatus] = useState<{
    ingredientAdded: number
    ingredientSkipped: number
    similaritiesAdded: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const [recipeStatus, setRecipeStatus] = useState<{ imported: number; skipped: number } | null>(null)
  const [recipeLoading, setRecipeLoading] = useState(false)

  async function doSeed() {
    setLoading(true)
    try {
      const ingredientResult = await seedNorwegianIngredients()
      const similarityResult = await seedIngredientSimilarities()
      setStatus({
        ingredientAdded: ingredientResult.added,
        ingredientSkipped: ingredientResult.skipped,
        similaritiesAdded: similarityResult.added,
      })
    } finally {
      setLoading(false)
    }
  }

  async function doSeedRecipes() {
    setRecipeLoading(true)
    try {
      const result = await importRecipes(SAMPLE_RECIPES_RAW as ImportedRecipe[])
      await seedRecipeNutrition(result.recipeIds)
      setRecipeStatus({ imported: result.imported, skipped: result.skipped })
    } finally {
      setRecipeLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-800">Ingredient library</p>
        <p className="text-sm text-gray-600">
          Load the ingredient library into the database. This pre-populates common ingredients with canonical names,
          normalized forms, ingredient families, shopping categories, and MISKG links for nutrition and substitutions.
        </p>
        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
          <li><strong>Exact</strong> - same ingredient in both recipes.</li>
          <li><strong>Normalized</strong> - different form of the same base ingredient.</li>
          <li><strong>Substitution</strong> - interchangeable according to MISKG.</li>
          <li><strong>Family</strong> - related ingredient family with weaker reuse value.</li>
        </ul>
        <p className="text-sm text-gray-500">
          Seeding is idempotent. Existing ingredients and similarities are skipped automatically.
        </p>
        <Button onClick={doSeed} disabled={loading}>
          {loading ? 'Seeding...' : 'Seed ingredient library'}
        </Button>
        {status && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              Added <strong>{status.ingredientAdded}</strong> ingredients, skipped <strong>{status.ingredientSkipped}</strong>, and added{' '}
              <strong>{status.similaritiesAdded}</strong> substitution similarities.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-5 space-y-4">
        <p className="text-sm font-medium text-gray-800">Sample recipes</p>
        <p className="text-sm text-gray-600">
          Load {SAMPLE_RECIPES_RAW.length} sample recipes into your library. Recipes already present (same title) are skipped.
        </p>
        <Button variant="secondary" onClick={doSeedRecipes} disabled={recipeLoading}>
          {recipeLoading ? 'Importing...' : `Seed ${SAMPLE_RECIPES_RAW.length} sample recipes`}
        </Button>
        {recipeStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              Imported <strong>{recipeStatus.imported}</strong> recipes, skipped <strong>{recipeStatus.skipped}</strong> as duplicates.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

type Tab = 'seed' | 'import' | 'export'

export default function Ingestion() {
  const [tab, setTab] = useState<Tab>('seed')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'seed', label: 'Ingredient library' },
    { id: 'import', label: 'JSON Import' },
    { id: 'export', label: 'Export' },
  ]

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Import / Export</h2>

      <div className="flex border-b border-gray-200 gap-0 mb-5">
        {tabs.map(tabItem => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tabItem.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'seed' && <SeedTab />}
      {tab === 'import' && <JSONImportTab />}
      {tab === 'export' && <ExportTab />}

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
