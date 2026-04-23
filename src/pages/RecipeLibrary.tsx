import { useState, useEffect, useId } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Recipe, RecipeStatus, RecipeNutrition } from '../db/types'
import { resolveOrCreateIngredient, normalizeIngredientName } from '../data/ingredientResolver'
import { seedRecipeNutrition } from '../engine/nutrition'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

function statusColor(status: RecipeStatus): 'green' | 'yellow' | 'blue' | 'gray' {
  return status === 'active'
    ? 'green'
    : status === 'review'
    ? 'yellow'
    : status === 'draft'
    ? 'blue'
    : 'gray'
}

function formatNutrition(value?: number): string | null {
  if (value == null) return null
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

interface IngRow {
  key: string
  raw_text: string
  quantity: string
  unit: string
  ingredient_name: string
  category: string
  optional: boolean
}

function emptyRow(): IngRow {
  return {
    key: crypto.randomUUID(),
    raw_text: '',
    quantity: '',
    unit: '',
    ingredient_name: '',
    category: '',
    optional: false,
  }
}

interface FormState {
  title: string
  description: string
  default_servings: string
  prep_time_min: string
  cook_time_min: string
  instructions: string
  tags: string
  status: RecipeStatus
}

function emptyForm(): FormState {
  return {
    title: '',
    description: '',
    default_servings: '2',
    prep_time_min: '',
    cook_time_min: '',
    instructions: '',
    tags: '',
    status: 'draft',
  }
}

function recipeToForm(recipe: Recipe): FormState {
  return {
    title: recipe.title,
    description: recipe.description ?? '',
    default_servings: String(recipe.default_servings),
    prep_time_min: recipe.prep_time_min != null ? String(recipe.prep_time_min) : '',
    cook_time_min: recipe.cook_time_min != null ? String(recipe.cook_time_min) : '',
    instructions: recipe.instructions ?? '',
    tags: (recipe.tags ?? []).join(', '),
    status: recipe.status,
  }
}

interface RecipeFormProps {
  recipe: Recipe | null
  onSaved: () => void
  onCancel: () => void
}

function RecipeForm({ recipe, onSaved, onCancel }: RecipeFormProps) {
  const [form, setForm] = useState<FormState>(() => recipe ? recipeToForm(recipe) : emptyForm())
  const [rows, setRows] = useState<IngRow[]>([emptyRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const uid = useId()

  useEffect(() => {
    if (!recipe?.recipe_id) return

    db.recipeIngredients.where('recipe_id').equals(recipe.recipe_id).toArray().then(async recipeIngredients => {
      if (recipeIngredients.length === 0) return

      const loadedRows: IngRow[] = await Promise.all(recipeIngredients.map(async recipeIngredient => {
        const ingredient = await db.ingredients.get(recipeIngredient.ingredient_id)
        return {
          key: crypto.randomUUID(),
          raw_text: recipeIngredient.raw_text,
          quantity: recipeIngredient.quantity != null ? String(recipeIngredient.quantity) : '',
          unit: recipeIngredient.unit ?? '',
          ingredient_name: ingredient?.canonical_name ?? '',
          category: ingredient?.category ?? '',
          optional: recipeIngredient.optional_flag ?? false,
        }
      }))

      setRows(loadedRows.length > 0 ? loadedRows : [emptyRow()])
    })
  }, [recipe?.recipe_id])

  function setField(key: keyof FormState, value: string) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function setRow(index: number, patch: Partial<IngRow>) {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  }

  function addRow() {
    setRows(current => [...current, emptyRow()])
  }

  function removeRow(index: number) {
    setRows(current => current.filter((_, rowIndex) => rowIndex !== index))
  }

  async function save() {
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const now = Date.now()
      const payload: Recipe = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        default_servings: parseInt(form.default_servings) || 2,
        prep_time_min: form.prep_time_min ? parseInt(form.prep_time_min) : undefined,
        cook_time_min: form.cook_time_min ? parseInt(form.cook_time_min) : undefined,
        total_time_min:
          form.prep_time_min && form.cook_time_min
            ? parseInt(form.prep_time_min) + parseInt(form.cook_time_min)
            : undefined,
        instructions: form.instructions.trim() || undefined,
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        status: form.status,
        source_type: 'manual',
        created_at: recipe?.created_at ?? now,
        updated_at: now,
      }

      let recipeId: number
      if (recipe?.recipe_id != null) {
        await db.recipes.update(recipe.recipe_id, payload)
        recipeId = recipe.recipe_id
        await db.recipeIngredients.where('recipe_id').equals(recipeId).delete()
      } else {
        recipeId = await db.recipes.add(payload)
      }

      for (const row of rows) {
        const name = row.ingredient_name.trim() || row.raw_text.trim()
        if (!name) continue

        const ingredientId = await resolveOrCreateIngredient(name)
        if (row.category.trim()) {
          await db.ingredients.update(ingredientId, { category: row.category.trim() })
        }

        await db.recipeIngredients.add({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          raw_text: row.raw_text.trim() || name,
          quantity: row.quantity ? parseFloat(row.quantity) : undefined,
          unit: row.unit.trim() || undefined,
          optional_flag: row.optional,
        })
      }

      await seedRecipeNutrition([recipeId])
      onSaved()
    } catch (saveError) {
      setError(String(saveError))
    } finally {
      setSaving(false)
    }
  }

  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'
  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls} htmlFor={`${uid}-title`}>Title *</label>
          <input id={`${uid}-title`} className={inputCls} value={form.title} onChange={event => setField('title', event.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls} htmlFor={`${uid}-desc`}>Description</label>
          <textarea id={`${uid}-desc`} className={inputCls} rows={2} value={form.description} onChange={event => setField('description', event.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${uid}-servings`}>Default servings</label>
          <input id={`${uid}-servings`} type="number" min={1} className={inputCls} value={form.default_servings} onChange={event => setField('default_servings', event.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${uid}-status`}>Status</label>
          <select id={`${uid}-status`} className={inputCls} value={form.status} onChange={event => setField('status', event.target.value as RecipeStatus)}>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor={`${uid}-prep`}>Prep time (min)</label>
          <input id={`${uid}-prep`} type="number" min={0} className={inputCls} value={form.prep_time_min} onChange={event => setField('prep_time_min', event.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${uid}-cook`}>Cook time (min)</label>
          <input id={`${uid}-cook`} type="number" min={0} className={inputCls} value={form.cook_time_min} onChange={event => setField('cook_time_min', event.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls} htmlFor={`${uid}-tags`}>Tags (comma-separated)</label>
          <input id={`${uid}-tags`} className={inputCls} placeholder="pasta, quick, vegetarian" value={form.tags} onChange={event => setField('tags', event.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={`${labelCls} mb-0`}>Ingredients</span>
          <Button variant="ghost" size="sm" onClick={addRow}>+ Add row</Button>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-1 text-xs text-gray-500 px-1">
            <span className="col-span-4">Raw text</span>
            <span className="col-span-2">Qty</span>
            <span className="col-span-2">Unit</span>
            <span className="col-span-2">Ingredient name</span>
            <span className="col-span-1">Category</span>
            <span className="col-span-1"></span>
          </div>
          {rows.map((row, index) => (
            <div key={row.key} className="grid grid-cols-12 gap-1 items-center">
              <input className={`${inputCls} col-span-4`} placeholder="2 cups flour" value={row.raw_text} onChange={event => setRow(index, { raw_text: event.target.value })} />
              <input className={`${inputCls} col-span-2`} placeholder="2" type="number" min={0} step="any" value={row.quantity} onChange={event => setRow(index, { quantity: event.target.value })} />
              <input className={`${inputCls} col-span-2`} placeholder="cups" value={row.unit} onChange={event => setRow(index, { unit: event.target.value })} />
              <input className={`${inputCls} col-span-2`} placeholder="flour" value={row.ingredient_name} onChange={event => setRow(index, { ingredient_name: event.target.value })} />
              <input className={`${inputCls} col-span-1`} placeholder="grain" value={row.category} onChange={event => setRow(index, { category: event.target.value })} />
              <button className="col-span-1 text-gray-400 hover:text-red-500 text-sm font-bold" onClick={() => removeRow(index)}>x</button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          "Raw text" is what you&apos;d write on a shopping list. "Ingredient name" is used for normalization and MISKG matching.
        </p>
      </div>

      <div>
        <label className={labelCls} htmlFor={`${uid}-instructions`}>Instructions</label>
        <textarea id={`${uid}-instructions`} className={inputCls} rows={5} value={form.instructions} onChange={event => setField('instructions', event.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Recipe'}</Button>
      </div>
    </div>
  )
}

function NutritionPill({ nutrition }: { nutrition?: RecipeNutrition }) {
  if (!nutrition) return null

  const calories = formatNutrition(nutrition.calories_per_serving)
  const protein = formatNutrition(nutrition.protein_g)
  const fiber = formatNutrition(nutrition.fiber_g)

  if (!calories && !protein && !fiber) return null

  return (
    <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-600">
      {calories && <span className="rounded-full bg-orange-50 text-orange-700 px-2 py-0.5">🔥 {calories} kcal</span>}
      {protein && <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">💪 {protein} g protein</span>}
      {fiber && <span className="rounded-full bg-green-50 text-green-700 px-2 py-0.5">🌾 {fiber} g fiber</span>}
      <span className="text-gray-400 self-center">(per serving)</span>
    </div>
  )
}

interface RecipeCardProps {
  recipe: Recipe
  nutrition?: RecipeNutrition
  onEdit: (recipe: Recipe) => void
  onDelete: (recipe: Recipe) => void
}

function RecipeCard({ recipe, nutrition, onEdit, onDelete }: RecipeCardProps) {
  const time = recipe.total_time_min ?? (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{recipe.title}</h3>
        <Badge color={statusColor(recipe.status)}>{recipe.status}</Badge>
      </div>
      {recipe.description && <p className="text-xs text-gray-500 line-clamp-2">{recipe.description}</p>}
      <div className="flex gap-3 text-xs text-gray-400">
        <span>{recipe.default_servings} servings</span>
        {time > 0 && <span>{time} min</span>}
      </div>
      <NutritionPill nutrition={nutrition} />
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {recipe.tags.map(tag => <Badge key={tag}>{tag}</Badge>)}
        </div>
      )}
      <div className="flex gap-2 pt-1 mt-auto">
        <Button variant="ghost" size="sm" onClick={() => onEdit(recipe)}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(recipe)} className="text-red-500 hover:text-red-700 hover:bg-red-50">Delete</Button>
      </div>
    </div>
  )
}

const STATUS_FILTERS: { label: string; value: RecipeStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Review', value: 'review' },
  { label: 'Archived', value: 'archived' },
]

export default function RecipeLibrary() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RecipeStatus | 'all'>('all')
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Recipe | null>(null)

  const recipes = useLiveQuery(() => db.recipes.orderBy('title').toArray(), [])
  const recipeNutrition = useLiveQuery(() => db.recipeNutrition.toArray(), [])

  const nutritionByRecipeId = new Map((recipeNutrition ?? []).map(nutrition => [nutrition.recipe_id, nutrition]))

  const filtered = (recipes ?? []).filter(recipe => {
    const matchSearch = normalizeIngredientName(recipe.title).includes(normalizeIngredientName(search))
    const matchStatus = statusFilter === 'all' || recipe.status === statusFilter
    return matchSearch && matchStatus
  })

  async function confirmDelete() {
    if (!deleting?.recipe_id) return

    await db.recipeIngredients.where('recipe_id').equals(deleting.recipe_id).delete()
    await db.recipeNutrition.delete(deleting.recipe_id)
    await db.recipes.delete(deleting.recipe_id)
    setDeleting(null)
  }

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Recipe Library</h2>
        <Button onClick={() => setAdding(true)}>Add Recipe</Button>
      </div>

      <div className="flex items-center gap-3">
        <input
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          placeholder="Search recipes..."
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <div className="flex gap-1">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {recipes === undefined ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <p className="text-sm">{search || statusFilter !== 'all' ? 'No recipes match your filters.' : 'No recipes yet.'}</p>
          {!search && statusFilter === 'all' && (
            <Button variant="secondary" onClick={() => setAdding(true)}>Add your first recipe</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-auto pb-2">
          {filtered.map(recipe => (
            <RecipeCard
              key={recipe.recipe_id}
              recipe={recipe}
              nutrition={recipe.recipe_id != null ? nutritionByRecipeId.get(recipe.recipe_id) : undefined}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Add Recipe" onClose={() => setAdding(false)} width="max-w-3xl">
          <RecipeForm recipe={null} onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Recipe" onClose={() => setEditing(null)} width="max-w-3xl">
          <RecipeForm recipe={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Delete Recipe"
          onClose={() => setDeleting(null)}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete}>Delete</Button>
            </>
          )}
        >
          <p className="text-sm text-gray-700">
            Delete <strong>{deleting.title}</strong>? This also removes its ingredient links and cached nutrition row.
          </p>
        </Modal>
      )}
    </div>
  )
}
