import { useState, useEffect, useId } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Recipe, RecipeStatus, Ingredient } from '../db/types'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

// ── helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: RecipeStatus): 'green' | 'yellow' | 'blue' | 'gray' {
  return s === 'active' ? 'green' : s === 'review' ? 'yellow' : s === 'draft' ? 'blue' : 'gray'
}

function normalize(name: string) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

async function findOrCreateIngredient(name: string): Promise<number> {
  const canonical = name.trim()
  const normalized = normalize(canonical)
  const existing = await db.ingredients.where('normalized_name').equals(normalized).first()
  if (existing?.ingredient_id != null) return existing.ingredient_id
  return db.ingredients.add({ canonical_name: canonical, normalized_name: normalized } as Ingredient)
}

// ── ingredient row types ──────────────────────────────────────────────────────

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
  return { key: crypto.randomUUID(), raw_text: '', quantity: '', unit: '', ingredient_name: '', category: '', optional: false }
}

// ── RecipeForm ────────────────────────────────────────────────────────────────

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
  return { title: '', description: '', default_servings: '2', prep_time_min: '', cook_time_min: '', instructions: '', tags: '', status: 'draft' }
}

function recipeToForm(r: Recipe): FormState {
  return {
    title: r.title,
    description: r.description ?? '',
    default_servings: String(r.default_servings),
    prep_time_min: r.prep_time_min != null ? String(r.prep_time_min) : '',
    cook_time_min: r.cook_time_min != null ? String(r.cook_time_min) : '',
    instructions: r.instructions ?? '',
    tags: (r.tags ?? []).join(', '),
    status: r.status,
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

  // Load existing ingredients when editing
  useEffect(() => {
    if (!recipe?.recipe_id) return
    db.recipeIngredients.where('recipe_id').equals(recipe.recipe_id).toArray().then(async (ris) => {
      if (ris.length === 0) return
      const loaded: IngRow[] = await Promise.all(ris.map(async (ri) => {
        const ing = await db.ingredients.get(ri.ingredient_id)
        return {
          key: crypto.randomUUID(),
          raw_text: ri.raw_text,
          quantity: ri.quantity != null ? String(ri.quantity) : '',
          unit: ri.unit ?? '',
          ingredient_name: ing?.canonical_name ?? '',
          category: ing?.category ?? '',
          optional: ri.optional_flag ?? false,
        }
      }))
      setRows(loaded.length > 0 ? loaded : [emptyRow()])
    })
  }, [recipe?.recipe_id])

  function setField(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setRow(idx: number, patch: Partial<IngRow>) {
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function addRow() { setRows(rs => [...rs, emptyRow()]) }
  function removeRow(idx: number) { setRows(rs => rs.filter((_, i) => i !== idx)) }

  async function save() {
    if (!form.title.trim()) { setError('Title is required'); return }
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
        total_time_min: (form.prep_time_min && form.cook_time_min)
          ? parseInt(form.prep_time_min) + parseInt(form.cook_time_min)
          : undefined,
        instructions: form.instructions.trim() || undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
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
        const ingredientId = await findOrCreateIngredient(name)
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

      onSaved()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'
  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}

      {/* Basic fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls} htmlFor={`${uid}-title`}>Title *</label>
          <input id={`${uid}-title`} className={inputCls} value={form.title} onChange={e => setField('title', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls} htmlFor={`${uid}-desc`}>Description</label>
          <textarea id={`${uid}-desc`} className={inputCls} rows={2} value={form.description} onChange={e => setField('description', e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${uid}-servings`}>Default servings</label>
          <input id={`${uid}-servings`} type="number" min={1} className={inputCls} value={form.default_servings} onChange={e => setField('default_servings', e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${uid}-status`}>Status</label>
          <select id={`${uid}-status`} className={inputCls} value={form.status} onChange={e => setField('status', e.target.value as RecipeStatus)}>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor={`${uid}-prep`}>Prep time (min)</label>
          <input id={`${uid}-prep`} type="number" min={0} className={inputCls} value={form.prep_time_min} onChange={e => setField('prep_time_min', e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${uid}-cook`}>Cook time (min)</label>
          <input id={`${uid}-cook`} type="number" min={0} className={inputCls} value={form.cook_time_min} onChange={e => setField('cook_time_min', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls} htmlFor={`${uid}-tags`}>Tags (comma-separated)</label>
          <input id={`${uid}-tags`} className={inputCls} placeholder="pasta, quick, vegetarian" value={form.tags} onChange={e => setField('tags', e.target.value)} />
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={labelCls + ' mb-0'}>Ingredients</span>
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
          {rows.map((row, idx) => (
            <div key={row.key} className="grid grid-cols-12 gap-1 items-center">
              <input className={`${inputCls} col-span-4`} placeholder="2 cups flour" value={row.raw_text} onChange={e => setRow(idx, { raw_text: e.target.value })} />
              <input className={`${inputCls} col-span-2`} placeholder="2" type="number" min={0} step="any" value={row.quantity} onChange={e => setRow(idx, { quantity: e.target.value })} />
              <input className={`${inputCls} col-span-2`} placeholder="cups" value={row.unit} onChange={e => setRow(idx, { unit: e.target.value })} />
              <input className={`${inputCls} col-span-2`} placeholder="flour" value={row.ingredient_name} onChange={e => setRow(idx, { ingredient_name: e.target.value })} />
              <input className={`${inputCls} col-span-1`} placeholder="grain" value={row.category} onChange={e => setRow(idx, { category: e.target.value })} />
              <button className="col-span-1 text-gray-400 hover:text-red-500 text-sm font-bold" onClick={() => removeRow(idx)}>×</button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          "Raw text" is what you'd write on a shopping list. "Ingredient name" is used for overlap matching — fill both for best results.
        </p>
      </div>

      {/* Instructions */}
      <div>
        <label className={labelCls} htmlFor={`${uid}-instructions`}>Instructions</label>
        <textarea id={`${uid}-instructions`} className={inputCls} rows={5} value={form.instructions} onChange={e => setField('instructions', e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Recipe'}</Button>
      </div>
    </div>
  )
}

// ── RecipeCard ────────────────────────────────────────────────────────────────

interface RecipeCardProps {
  recipe: Recipe
  onEdit: (r: Recipe) => void
  onDelete: (r: Recipe) => void
}

function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  const time = recipe.total_time_min ?? (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{recipe.title}</h3>
        <Badge color={statusColor(recipe.status)}>{recipe.status}</Badge>
      </div>
      {recipe.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{recipe.description}</p>
      )}
      <div className="flex gap-3 text-xs text-gray-400">
        <span>{recipe.default_servings} servings</span>
        {time > 0 && <span>{time} min</span>}
      </div>
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {recipe.tags.map(t => <Badge key={t}>{t}</Badge>)}
        </div>
      )}
      <div className="flex gap-2 pt-1 mt-auto">
        <Button variant="ghost" size="sm" onClick={() => onEdit(recipe)}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(recipe)} className="text-red-500 hover:text-red-700 hover:bg-red-50">Delete</Button>
      </div>
    </div>
  )
}

// ── RecipeLibrary (main) ──────────────────────────────────────────────────────

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

  const recipes = useLiveQuery(
    () => db.recipes.orderBy('title').toArray(),
    [],
  )

  const filtered = (recipes ?? []).filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  async function confirmDelete() {
    if (!deleting?.recipe_id) return
    await db.recipeIngredients.where('recipe_id').equals(deleting.recipe_id).delete()
    await db.recipes.delete(deleting.recipe_id)
    setDeleting(null)
  }

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Recipe Library</h2>
        <Button onClick={() => setAdding(true)}>Add Recipe</Button>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <input
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          placeholder="Search recipes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
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

      {/* Recipe grid */}
      {recipes === undefined ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <p className="text-sm">{search || statusFilter !== 'all' ? 'No recipes match your filters.' : 'No recipes yet.'}</p>
          {!search && statusFilter === 'all' && (
            <Button variant="secondary" onClick={() => setAdding(true)}>Add your first recipe</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-auto pb-2">
          {filtered.map(r => (
            <RecipeCard
              key={r.recipe_id}
              recipe={r}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {adding && (
        <Modal title="Add Recipe" onClose={() => setAdding(false)} width="max-w-3xl">
          <RecipeForm recipe={null} onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title="Edit Recipe" onClose={() => setEditing(null)} width="max-w-3xl">
          <RecipeForm recipe={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleting && (
        <Modal
          title="Delete Recipe"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete}>Delete</Button>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            Delete <strong>{deleting.title}</strong>? This also removes its ingredient links. This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}
