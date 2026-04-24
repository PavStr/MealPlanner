import { useState, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import type { Recipe } from '../db/types'
import { getRecommendations, type RecommendationResult } from '../engine/recommender'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { usePlanDraft } from '../state/planDraft'

const MAX_ANCHORS = 4

// ── RecipePickerRow ───────────────────────────────────────────────────────────

interface RecipePickerRowProps {
  recipe: Recipe
  selected: boolean
  onToggle: (r: Recipe) => void
  disabled: boolean
}

function RecipePickerRow({ recipe, selected, onToggle, disabled }: RecipePickerRowProps) {
  return (
    <button
      onClick={() => onToggle(recipe)}
      disabled={disabled && !selected}
      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2 ${
        selected
          ? 'bg-blue-50 border border-blue-300 text-blue-900'
          : disabled
          ? 'opacity-40 cursor-not-allowed bg-white border border-gray-200'
          : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-800'
      }`}
    >
      <span className="font-medium truncate">{recipe.title}</span>
      <span className="shrink-0 text-xs text-gray-400">{recipe.default_servings} srv</span>
    </button>
  )
}

// ── RecommendationCard ────────────────────────────────────────────────────────

interface RecommendationCardProps {
  result: RecommendationResult
  rank: number
  included: boolean
  onToggle: (id: number) => void
}

function RecommendationCard({ result, rank, included, onToggle }: RecommendationCardProps) {
  const { recipe, explanation, sharedIngredientNames, newIngredientNames } = result
  if (!recipe.recipe_id) return null

  return (
    <div className={`border rounded-lg p-4 space-y-2 transition-colors ${included ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-2">
        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{rank}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{recipe.title}</p>
          <p className="text-xs text-gray-500">{recipe.default_servings} servings</p>
        </div>
        <Button
          variant={included ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => onToggle(recipe.recipe_id!)}
        >
          {included ? 'Remove' : 'Add to plan'}
        </Button>
      </div>

      <ul className="text-xs text-gray-600 space-y-0.5 pl-8">
        {explanation.map((line, i) => <li key={i}>{line}</li>)}
      </ul>

      {sharedIngredientNames.length > 0 && (
        <div className="pl-8 flex flex-wrap gap-1">
          {sharedIngredientNames.map(n => <Badge key={n} color="green">{n}</Badge>)}
        </div>
      )}
      {newIngredientNames.length > 0 && (
        <div className="pl-8 flex flex-wrap gap-1">
          {newIngredientNames.slice(0, 8).map(n => <Badge key={n} color="gray">{n}</Badge>)}
          {newIngredientNames.length > 8 && <Badge color="gray">+{newIngredientNames.length - 8} more</Badge>}
        </div>
      )}
    </div>
  )
}

// ── PlanBuilder (main) ────────────────────────────────────────────────────────

export default function PlanBuilder() {
  const navigate = useNavigate()
  const { draft, setDraft, clearDraft } = usePlanDraft()
  const [search, setSearch] = useState('')
  const [anchorIds, setAnchorIds] = useState<number[]>(() => draft?.anchorIds ?? [])
  const [targetMeals, setTargetMeals] = useState(() => draft?.targetMeals ?? 4)
  const [targetServings, setTargetServings] = useState(() => draft?.targetServings ?? 2)
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>(() => draft?.recommendations ?? [])
  const [includedIds, setIncludedIds] = useState<Set<number>>(() => new Set(draft?.includedIds ?? []))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ran, setRan] = useState(() => draft?.ran ?? false)

  const activeRecipes = useLiveQuery(
    () => db.recipes.where('status').equals('active').sortBy('title'),
    [],
  )

  useEffect(() => {
    if (anchorIds.length === 0) {
      clearDraft()
      return
    }

    const recommendationIds = new Set(
      recommendations
        .map(result => result.recipe.recipe_id)
        .filter((recipeId): recipeId is number => recipeId != null),
    )

    setDraft({
      targetMeals,
      targetServings,
      anchorIds,
      recommendations: recommendations.filter(result => result.recipe.recipe_id != null),
      includedIds: Array.from(includedIds).filter(id => recommendationIds.has(id)),
      ran,
      updatedAt: Date.now(),
    })
  }, [anchorIds, targetMeals, targetServings, recommendations, includedIds, ran, setDraft, clearDraft])

  const filtered = (activeRecipes ?? []).filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()),
  )

  const anchorRecipes = (activeRecipes ?? []).filter(r => anchorIds.includes(r.recipe_id!))

  function toggleAnchor(r: Recipe) {
    if (!r.recipe_id) return
    setAnchorIds(ids =>
      ids.includes(r.recipe_id!)
        ? ids.filter(id => id !== r.recipe_id!)
        : ids.length < MAX_ANCHORS
        ? [...ids, r.recipe_id!]
        : ids,
    )
    setRecommendations([])
    setIncludedIds(new Set())
    setRan(false)
  }

  const runRecommendations = useCallback(async () => {
    if (anchorIds.length === 0) return
    setLoading(true)
    setRan(false)
    try {
      const results = await getRecommendations(anchorIds)
      setRecommendations(results)
      setIncludedIds(new Set())
      setRan(true)
    } finally {
      setLoading(false)
    }
  }, [anchorIds])

  function toggleIncluded(id: number) {
    setIncludedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function savePlan() {
    if (anchorIds.length === 0) return
    setSaving(true)
    try {
      const now = Date.now()
      const planId = await db.weeklyPlans.add({
        target_meals: targetMeals,
        target_servings: targetServings,
        created_at: now,
        updated_at: now,
      })
      for (const id of anchorIds) {
        await db.weeklyPlanRecipes.add({ plan_id: planId, recipe_id: id, role: 'anchor' })
      }
      let rank = 1
      for (const res of recommendations) {
        if (!res.recipe.recipe_id) continue
        const role = includedIds.has(res.recipe.recipe_id) ? 'final' : 'suggested'
        await db.weeklyPlanRecipes.add({ plan_id: planId, recipe_id: res.recipe.recipe_id, role, rank: rank++ })
      }
      clearDraft()
      navigate(`/summary/${planId}`)
    } finally {
      setSaving(false)
    }
  }

  const totalRecipes = anchorIds.length + includedIds.size

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Plan Builder</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — recipe selection */}
        <div className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search active recipes</label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">
              Select up to {MAX_ANCHORS} anchor recipes ({anchorIds.length}/{MAX_ANCHORS} selected)
            </p>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-1.5">
            {activeRecipes === undefined ? (
              <p className="text-sm text-gray-500 p-2">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">No active recipes found. Mark recipes as "Active" in the library.</p>
            ) : (
              filtered.map(r => (
                <RecipePickerRow
                  key={r.recipe_id}
                  recipe={r}
                  selected={anchorIds.includes(r.recipe_id!)}
                  onToggle={toggleAnchor}
                  disabled={anchorIds.length >= MAX_ANCHORS}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel — plan config + recommendations */}
        <div className="flex-1 flex flex-col overflow-auto p-6 gap-5">
          {/* Controls */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Plan Settings</h3>
            <div className="flex gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Meals per week</label>
                <input
                  type="number" min={1} max={14}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={targetMeals}
                  onChange={e => setTargetMeals(parseInt(e.target.value) || 4)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Servings</label>
                <input
                  type="number" min={1} max={20}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={targetServings}
                  onChange={e => setTargetServings(parseInt(e.target.value) || 2)}
                />
              </div>
            </div>

            {/* Selected anchors summary */}
            {anchorRecipes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1.5">Selected anchor recipes</p>
                <div className="flex flex-wrap gap-1.5">
                  {anchorRecipes.map(r => (
                    <Badge key={r.recipe_id} color="blue">
                      {r.title}
                      <button
                        className="ml-1 hover:text-red-600"
                        onClick={() => toggleAnchor(r)}
                      >×</button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={runRecommendations}
                disabled={anchorIds.length === 0 || loading}
              >
                {loading ? 'Finding recommendations…' : 'Get Recommendations'}
              </Button>
              {anchorIds.length === 0 && (
                <p className="text-xs text-gray-400">Select at least one recipe to get recommendations</p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {ran && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  {recommendations.length > 0 ? 'Recommended recipes' : 'No recommendations available'}
                </h3>
                {recommendations.length === 0 && (
                  <p className="text-xs text-gray-400">Add more active recipes to the library to get suggestions.</p>
                )}
              </div>

              {recommendations.map((res, i) => (
                <RecommendationCard
                  key={res.recipe.recipe_id}
                  result={res}
                  rank={i + 1}
                  included={includedIds.has(res.recipe.recipe_id!)}
                  onToggle={toggleIncluded}
                />
              ))}

              {/* Save plan */}
              <div className="pt-2 border-t border-gray-200 flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Plan: <strong>{anchorIds.length}</strong> anchor + <strong>{includedIds.size}</strong> suggested = <strong>{totalRecipes}</strong> recipes
                  {totalRecipes < targetMeals && (
                    <span className="text-yellow-600 ml-2">(target is {targetMeals})</span>
                  )}
                </div>
                <Button onClick={savePlan} disabled={saving || anchorIds.length === 0}>
                  {saving ? 'Saving…' : 'Save Plan'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
