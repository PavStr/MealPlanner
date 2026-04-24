import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import type {
  PlanRecipeRole,
  Recipe,
  RecipeNutrition,
  WeeklyPlan,
  WeeklyPlanRecipe,
} from '../db/types'
import {
  generateShoppingList,
  generatePrepPlan,
  generateConsolidationSuggestions,
  type ShoppingList,
  type PrepTask,
  type ConsolidationSuggestion,
} from '../engine/shoppingList'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { usePlanDraft, type PlanDraft } from '../state/planDraft'

interface SummaryPlanRecipe {
  key: string
  recipe_id: number
  role: PlanRecipeRole
  rank?: number
}

interface PlanCardProps {
  title: string
  subtitle: string
  active: boolean
  onClick: () => void
  badge?: ReactNode
}

function PlanCard({ title, subtitle, active, onClick, badge }: PlanCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? 'bg-blue-50 border border-blue-300 text-blue-900'
          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <p className="font-medium">{title}</p>
        {badge}
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </button>
  )
}

function formatSavedPlanSubtitle(plan: WeeklyPlan) {
  return `${plan.target_meals} meals · ${plan.target_servings} servings · ${new Date(plan.created_at).toLocaleDateString()}`
}

function formatDraftPlanSubtitle(draft: PlanDraft) {
  return `${draft.targetMeals} meals · ${draft.targetServings} servings · Updated ${new Date(draft.updatedAt).toLocaleString()}`
}

function buildDraftPlanRecipes(draft: PlanDraft | null): SummaryPlanRecipe[] {
  if (!draft || draft.anchorIds.length === 0) return []

  const planRecipes: SummaryPlanRecipe[] = draft.anchorIds.map(recipeId => ({
    key: `draft-anchor-${recipeId}`,
    recipe_id: recipeId,
    role: 'anchor',
  }))

  draft.recommendations.forEach((result, index) => {
    const recipeId = result.recipe.recipe_id
    if (recipeId == null) return

    planRecipes.push({
      key: `draft-rec-${recipeId}`,
      recipe_id: recipeId,
      role: draft.includedIds.includes(recipeId) ? 'final' : 'suggested',
      rank: index + 1,
    })
  })

  return planRecipes
}

function ShoppingListSection({ list }: { list: ShoppingList }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(category: string) {
    setCollapsed(previous => {
      const next = new Set(previous)
      next.has(category) ? next.delete(category) : next.add(category)
      return next
    })
  }

  if (list.categories.length === 0) {
    return <p className="text-sm text-gray-400 italic">No ingredient data. Add ingredients to your recipes in the library.</p>
  }

  return (
    <div className="space-y-3">
      {list.categories.map(category => (
        <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(category)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <span>{category}</span>
            <span className="text-gray-400 text-xs">{collapsed.has(category) ? 'Show' : 'Hide'}</span>
          </button>
          {!collapsed.has(category) && (
            <ul className="divide-y divide-gray-100">
              {list.byCategory[category].map(item => (
                <li key={item.ingredient_id} className="px-4 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800">{item.canonical_name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{item.entries.length} recipe{item.entries.length !== 1 ? 's' : ''}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {item.entries.map((entry, index) => (
                      <li key={index} className="text-xs text-gray-500 flex gap-2">
                        <span className="text-gray-300">-</span>
                        <span>{entry.raw_text}{entry.optional ? ' (optional)' : ''}</span>
                        <span className="text-gray-300 italic">{entry.recipe_title}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

function ConsolidationPanel({ suggestions }: { suggestions: ConsolidationSuggestion[] }) {
  if (suggestions.length === 0) return null

  return (
    <div className="mb-5 border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-amber-100 border-b border-amber-200">
        <p className="text-sm font-semibold text-amber-900">
          Simplify your shop - {suggestions.length} swap{suggestions.length !== 1 ? 's' : ''} suggested
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          These ingredients are interchangeable. Using one throughout reduces what you need to buy.
        </p>
      </div>
      <ul className="divide-y divide-amber-100">
        {suggestions.map((suggestion, index) => (
          <li key={index} className="px-4 py-3 flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-amber-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm text-gray-800">
                Use <strong>{suggestion.keep}</strong> instead of <strong>{suggestion.replace}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Swap in: {suggestion.affectedRecipes.join(', ')}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PrepPlanSection({ tasks }: { tasks: PrepTask[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-gray-400 italic">No shared prep identified. Recipes share no common ingredients, or only one recipe is in the plan.</p>
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task, index) => (
        <li key={index} className="flex gap-3 items-start">
          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold mt-0.5">{index + 1}</span>
          <div>
            <p className="text-sm text-gray-800">{task.description}</p>
            <p className="text-xs text-gray-400 mt-0.5">Used in: {task.recipes.join(', ')}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function formatMetric(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function nutritionLevelClass(level: 'good' | 'moderate' | 'low'): string {
  if (level === 'good') return 'bg-green-50 text-green-700 border-green-200'
  if (level === 'moderate') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

function calorieLevel(avgCalories: number): 'good' | 'moderate' | 'low' {
  if (avgCalories >= 450 && avgCalories <= 850) return 'good'
  if (avgCalories >= 300 && avgCalories <= 1000) return 'moderate'
  return 'low'
}

function proteinLevel(avgProtein: number): 'good' | 'moderate' | 'low' {
  if (avgProtein >= 20) return 'good'
  if (avgProtein >= 12) return 'moderate'
  return 'low'
}

function fiberLevel(avgFiber: number): 'good' | 'moderate' | 'low' {
  if (avgFiber >= 8) return 'good'
  if (avgFiber >= 4) return 'moderate'
  return 'low'
}

function NutritionSummarySection({
  recipes,
  nutritionRows,
}: {
  recipes: Recipe[]
  nutritionRows: (RecipeNutrition | undefined)[]
}) {
  if (recipes.length === 0 || nutritionRows.length === 0) return null

  let totalCalories = 0
  let totalProtein = 0
  let totalFiber = 0
  let totalServings = 0
  let coveredRecipes = 0

  for (const recipe of recipes) {
    if (recipe.recipe_id == null) continue
    const nutrition = nutritionRows.find(row => row?.recipe_id === recipe.recipe_id)
    if (!nutrition) continue

    const servings = Math.max(recipe.default_servings || 1, 1)
    totalCalories += (nutrition.calories_per_serving ?? 0) * servings
    totalProtein += (nutrition.protein_g ?? 0) * servings
    totalFiber += (nutrition.fiber_g ?? 0) * servings
    totalServings += servings
    coveredRecipes++
  }

  if (coveredRecipes === 0 || totalServings === 0) return null

  const avgCalories = totalCalories / totalServings
  const avgProtein = totalProtein / totalServings
  const avgFiber = totalFiber / totalServings

  const cards = [
    {
      label: 'Calories',
      icon: '🔥',
      total: `${formatMetric(totalCalories)} kcal`,
      average: `${formatMetric(avgCalories)} kcal / serving`,
      level: calorieLevel(avgCalories),
    },
    {
      label: 'Protein',
      icon: '💪',
      total: `${formatMetric(totalProtein)} g`,
      average: `${formatMetric(avgProtein)} g / serving`,
      level: proteinLevel(avgProtein),
    },
    {
      label: 'Fiber',
      icon: '🌾',
      total: `${formatMetric(totalFiber)} g`,
      average: `${formatMetric(avgFiber)} g / serving`,
      level: fiberLevel(avgFiber),
    },
  ] as const

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nutrition Summary</p>
          <p className="text-sm text-gray-500 mt-1">
            Totals across included recipes using each recipe&apos;s default servings.
          </p>
        </div>
        <span className="text-xs text-gray-400">{coveredRecipes} recipe{coveredRecipes !== 1 ? 's' : ''} with nutrition data</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map(card => (
          <div key={card.label} className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800">{card.icon} {card.label}</p>
              <span className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${nutritionLevelClass(card.level)}`}>
                {card.level}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{card.total}</p>
            <p className="text-xs text-gray-500">{card.average}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PlanSummary() {
  const { planId: planIdParam } = useParams()
  const navigate = useNavigate()
  const { draft } = usePlanDraft()

  const plans = useLiveQuery(() => db.weeklyPlans.orderBy('created_at').reverse().toArray(), [])
  const parsedPlanId = planIdParam ? Number.parseInt(planIdParam, 10) : null
  const requestedPlanId = parsedPlanId != null && Number.isFinite(parsedPlanId)
    ? parsedPlanId
    : null
  const hasDraft = Boolean(draft && draft.anchorIds.length > 0)
  const viewingDraft = requestedPlanId == null && hasDraft
  const activeSavedPlanId = requestedPlanId ?? (!hasDraft ? plans?.[0]?.plan_id ?? null : null)

  const savedPlanRecipeRows = useLiveQuery(
    () => activeSavedPlanId != null
      ? db.weeklyPlanRecipes.where('plan_id').equals(activeSavedPlanId).toArray()
      : Promise.resolve([] as WeeklyPlanRecipe[]),
    [activeSavedPlanId],
  )

  const savedPlanRecipes = useMemo<SummaryPlanRecipe[]>(
    () => (savedPlanRecipeRows ?? []).map(planRecipe => ({
      key: `saved-${planRecipe.plan_recipe_id ?? `${planRecipe.role}-${planRecipe.recipe_id}-${planRecipe.rank ?? 0}`}`,
      recipe_id: planRecipe.recipe_id,
      role: planRecipe.role,
      rank: planRecipe.rank,
    })),
    [savedPlanRecipeRows],
  )

  const draftPlanRecipes = useMemo(
    () => buildDraftPlanRecipes(draft),
    [draft],
  )

  const currentPlanRecipes = useMemo(
    () => viewingDraft ? draftPlanRecipes : savedPlanRecipes,
    [viewingDraft, draftPlanRecipes, savedPlanRecipes],
  )

  const currentRecipeIds = useMemo(
    () => currentPlanRecipes.map(planRecipe => planRecipe.recipe_id),
    [currentPlanRecipes],
  )

  const includedRecipeIds = useMemo(
    () => currentPlanRecipes
      .filter(planRecipe => planRecipe.role === 'anchor' || planRecipe.role === 'final')
      .map(planRecipe => planRecipe.recipe_id),
    [currentPlanRecipes],
  )

  const [recipes, setRecipes] = useState<Map<number, Recipe>>(new Map())
  const [shoppingList, setShoppingList] = useState<ShoppingList>({ byCategory: {}, categories: [] })
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([])
  const [consolidations, setConsolidations] = useState<ConsolidationSuggestion[]>([])
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<'overview' | 'shopping' | 'prep'>('overview')

  const dataSourceKey = viewingDraft
    ? `draft-${draft?.updatedAt ?? 0}`
    : `saved-${activeSavedPlanId ?? 'none'}`
  const recipeIdsKey = currentRecipeIds.join('|')
  const includedIdsKey = includedRecipeIds.join('|')

  useEffect(() => {
    let cancelled = false

    if (currentRecipeIds.length === 0) {
      setRecipes(new Map())
      setShoppingList({ byCategory: {}, categories: [] })
      setPrepTasks([])
      setConsolidations([])
      setLoadError('')
      return
    }

    setLoadError('')

    Promise.allSettled([
      db.recipes.bulkGet(currentRecipeIds),
      generateShoppingList(includedRecipeIds),
      generatePrepPlan(includedRecipeIds),
      generateConsolidationSuggestions(includedRecipeIds),
    ]).then(([recipesResult, listResult, tasksResult, swapsResult]) => {
      if (cancelled) return

      if (recipesResult.status === 'fulfilled') {
        const recipeMap = new Map<number, Recipe>()
        recipesResult.value.forEach(recipe => {
          if (recipe?.recipe_id) recipeMap.set(recipe.recipe_id, recipe)
        })
        setRecipes(recipeMap)
      } else {
        setRecipes(new Map())
        setLoadError(`Could not load recipes: ${recipesResult.reason}`)
      }

      setShoppingList(listResult.status === 'fulfilled' ? listResult.value : { byCategory: {}, categories: [] })
      setPrepTasks(tasksResult.status === 'fulfilled' ? tasksResult.value : [])
      setConsolidations(swapsResult.status === 'fulfilled' ? swapsResult.value : [])
    })

    return () => {
      cancelled = true
    }
  }, [dataSourceKey, recipeIdsKey, includedIdsKey, currentRecipeIds, includedRecipeIds])

  const nutritionRows = useLiveQuery(
    () => includedRecipeIds.length > 0
      ? db.recipeNutrition.bulkGet(includedRecipeIds)
      : Promise.resolve([] as (RecipeNutrition | undefined)[]),
    [dataSourceKey, includedIdsKey],
  )

  const activePlan = activeSavedPlanId != null
    ? plans?.find(plan => plan.plan_id === activeSavedPlanId)
    : undefined

  const anchorRecipes = currentPlanRecipes.filter(planRecipe => planRecipe.role === 'anchor')
  const finalRecipes = currentPlanRecipes.filter(planRecipe => planRecipe.role === 'final')
  const suggestedOnly = currentPlanRecipes.filter(planRecipe => planRecipe.role === 'suggested')

  const includedRecipes = includedRecipeIds
    .map(recipeId => recipes.get(recipeId))
    .filter((recipe): recipe is Recipe => Boolean(recipe))

  const showingSavedPlan = !viewingDraft && Boolean(activePlan)
  const missingSavedPlan = requestedPlanId != null && !viewingDraft && plans !== undefined && !activePlan
  const hasVisiblePlan = viewingDraft || showingSavedPlan

  async function deletePlan() {
    if (activeSavedPlanId == null) return

    await db.weeklyPlanRecipes.where('plan_id').equals(activeSavedPlanId).delete()
    await db.weeklyPlans.delete(activeSavedPlanId)
    navigate('/summary')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Plan Summary</h2>
        <Button onClick={() => navigate('/plan')}>New Plan</Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plans</p>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {viewingDraft && draft && (
              <PlanCard
                title="Current Draft"
                subtitle={formatDraftPlanSubtitle(draft)}
                active
                onClick={() => navigate('/summary')}
                badge={<Badge color="yellow">Live</Badge>}
              />
            )}

            {!viewingDraft && draft && (
              <PlanCard
                title="Current Draft"
                subtitle={formatDraftPlanSubtitle(draft)}
                active={false}
                onClick={() => navigate('/summary')}
                badge={<Badge color="yellow">Live</Badge>}
              />
            )}

            {plans === undefined ? (
              <p className="text-sm text-gray-500 p-2">Loading...</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-gray-400 p-2">
                {draft ? 'No saved plans yet.' : 'No saved plans yet. Build one in Plan Builder.'}
              </p>
            ) : (
              plans.map(plan => (
                <PlanCard
                  key={plan.plan_id}
                  title={plan.name ?? `Plan ${plan.plan_id}`}
                  subtitle={formatSavedPlanSubtitle(plan)}
                  active={!viewingDraft && plan.plan_id === activeSavedPlanId}
                  onClick={() => navigate(`/summary/${plan.plan_id}`)}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!hasVisiblePlan ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-sm">
                {missingSavedPlan
                  ? 'That saved plan could not be found.'
                  : 'Select a saved plan, or create one in Plan Builder to preview it here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {viewingDraft
                        ? 'Current Draft'
                        : activePlan?.name ?? `Plan ${activeSavedPlanId}`}
                    </h3>
                    <Badge color={viewingDraft ? 'yellow' : 'blue'}>
                      {viewingDraft ? 'Unsaved' : 'Saved'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {viewingDraft && draft
                      ? `${draft.targetMeals} meals · ${draft.targetServings} servings · Last updated ${new Date(draft.updatedAt).toLocaleString()}`
                      : activePlan
                      ? formatSavedPlanSubtitle(activePlan)
                      : ''}
                  </p>
                </div>
                {!viewingDraft && activePlan && (
                  <Button variant="danger" size="sm" onClick={deletePlan}>Delete plan</Button>
                )}
              </div>

              {loadError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{loadError}</p>
              )}

              <div className="flex border-b border-gray-200 gap-0">
                {(['overview', 'shopping', 'prep'] as const).map(currentTab => (
                  <button
                    key={currentTab}
                    onClick={() => setTab(currentTab)}
                    className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                      tab === currentTab
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {currentTab === 'shopping' ? 'Shopping List' : currentTab === 'prep' ? 'Prep Plan' : 'Overview'}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Anchor Recipes</p>
                    <div className="space-y-1.5">
                      {anchorRecipes.map(planRecipe => {
                        const recipe = recipes.get(planRecipe.recipe_id)
                        return recipe ? (
                          <div key={planRecipe.key} className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-md">
                            <Badge color="blue">Anchor</Badge>
                            <span className="text-sm text-gray-800 font-medium">{recipe.title}</span>
                            <span className="text-xs text-gray-400 ml-auto">{recipe.default_servings} srv</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>

                  {finalRecipes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Added from Suggestions</p>
                      <div className="space-y-1.5">
                        {finalRecipes.map(planRecipe => {
                          const recipe = recipes.get(planRecipe.recipe_id)
                          return recipe ? (
                            <div key={planRecipe.key} className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-md">
                              <Badge color="green">Suggested</Badge>
                              <span className="text-sm text-gray-800 font-medium">{recipe.title}</span>
                              <span className="text-xs text-gray-400 ml-auto">{recipe.default_servings} srv</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  {suggestedOnly.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Suggestions not included</p>
                      <div className="space-y-1.5">
                        {suggestedOnly.map(planRecipe => {
                          const recipe = recipes.get(planRecipe.recipe_id)
                          return recipe ? (
                            <div key={planRecipe.key} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-md opacity-60">
                              <Badge>Skipped</Badge>
                              <span className="text-sm text-gray-600">{recipe.title}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  <NutritionSummarySection recipes={includedRecipes} nutritionRows={nutritionRows ?? []} />
                </div>
              )}

              {tab === 'shopping' && (
                <>
                  <ConsolidationPanel suggestions={consolidations} />
                  <ShoppingListSection list={shoppingList} />
                </>
              )}

              {tab === 'prep' && <PrepPlanSection tasks={prepTasks} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
