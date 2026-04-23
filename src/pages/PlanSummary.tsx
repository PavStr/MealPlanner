import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import type { Recipe, RecipeNutrition, WeeklyPlan } from '../db/types'
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

interface PlanCardProps {
  plan: WeeklyPlan
  active: boolean
  onClick: () => void
}

function PlanCard({ plan, active, onClick }: PlanCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? 'bg-blue-50 border border-blue-300 text-blue-900'
          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      <p className="font-medium">{plan.name ?? `Plan ${plan.plan_id}`}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {plan.target_meals} meals · {plan.target_servings} servings · {new Date(plan.created_at).toLocaleDateString()}
      </p>
    </button>
  )
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

  const plans = useLiveQuery(() => db.weeklyPlans.orderBy('created_at').reverse().toArray(), [])
  const [activePlanId, setActivePlanId] = useState<number | null>(null)

  const planRecipes = useLiveQuery(
    () => activePlanId != null
      ? db.weeklyPlanRecipes.where('plan_id').equals(activePlanId).toArray()
      : Promise.resolve([] as { plan_recipe_id?: number; plan_id: number; recipe_id: number; role: 'anchor' | 'suggested' | 'final'; rank?: number }[]),
    [activePlanId],
  )

  const [recipes, setRecipes] = useState<Map<number, Recipe>>(new Map())
  const [shoppingList, setShoppingList] = useState<ShoppingList>({ byCategory: {}, categories: [] })
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([])
  const [consolidations, setConsolidations] = useState<ConsolidationSuggestion[]>([])
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<'overview' | 'shopping' | 'prep'>('overview')

  useEffect(() => {
    if (planIdParam) {
      setActivePlanId(parseInt(planIdParam))
    } else if (plans && plans.length > 0 && activePlanId === null) {
      setActivePlanId(plans[0].plan_id!)
    }
  }, [planIdParam, plans, activePlanId])

  useEffect(() => {
    if (!planRecipes || planRecipes.length === 0) {
      setRecipes(new Map())
      setShoppingList({ byCategory: {}, categories: [] })
      setPrepTasks([])
      setConsolidations([])
      setLoadError('')
      return
    }

    const recipeIds = planRecipes.map(planRecipe => planRecipe.recipe_id)
    const includedIds = planRecipes
      .filter(planRecipe => planRecipe.role === 'anchor' || planRecipe.role === 'final')
      .map(planRecipe => planRecipe.recipe_id)

    Promise.allSettled([
      db.recipes.bulkGet(recipeIds),
      generateShoppingList(includedIds),
      generatePrepPlan(includedIds),
      generateConsolidationSuggestions(includedIds),
    ]).then(([recipesResult, listResult, tasksResult, swapsResult]) => {
      if (recipesResult.status === 'fulfilled') {
        const recipeMap = new Map<number, Recipe>()
        recipesResult.value.forEach(recipe => {
          if (recipe?.recipe_id) recipeMap.set(recipe.recipe_id, recipe)
        })
        setRecipes(recipeMap)
      } else {
        setLoadError(`Could not load recipes: ${recipesResult.reason}`)
      }
      if (listResult.status === 'fulfilled') setShoppingList(listResult.value)
      if (tasksResult.status === 'fulfilled') setPrepTasks(tasksResult.value)
      if (swapsResult.status === 'fulfilled') setConsolidations(swapsResult.value)
    })
  }, [planRecipes])

  const activePlan = plans?.find(plan => plan.plan_id === activePlanId)
  const anchorRecipes = (planRecipes ?? []).filter(planRecipe => planRecipe.role === 'anchor')
  const finalRecipes = (planRecipes ?? []).filter(planRecipe => planRecipe.role === 'final')
  const suggestedOnly = (planRecipes ?? []).filter(planRecipe => planRecipe.role === 'suggested')

  const includedRecipeIds = (planRecipes ?? [])
    .filter(planRecipe => planRecipe.role === 'anchor' || planRecipe.role === 'final')
    .map(planRecipe => planRecipe.recipe_id)

  const nutritionRows = useLiveQuery(
    () => includedRecipeIds.length > 0
      ? db.recipeNutrition.bulkGet(includedRecipeIds)
      : Promise.resolve([] as (RecipeNutrition | undefined)[]),
    [includedRecipeIds.join('|')],
  )

  const includedRecipes = includedRecipeIds
    .map(recipeId => recipes.get(recipeId))
    .filter((recipe): recipe is Recipe => Boolean(recipe))

  async function deletePlan() {
    if (activePlanId == null) return

    await db.weeklyPlanRecipes.where('plan_id').equals(activePlanId).delete()
    await db.weeklyPlans.delete(activePlanId)
    setActivePlanId(null)
    navigate('/summary')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Plan Summary</h2>
        <Button onClick={() => navigate('/plan')}>New Plan</Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saved Plans</p>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {plans === undefined ? (
              <p className="text-sm text-gray-500 p-2">Loading...</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-gray-400 p-2">No saved plans yet. Build one in Plan Builder.</p>
            ) : (
              plans.map(plan => (
                <PlanCard
                  key={plan.plan_id}
                  plan={plan}
                  active={plan.plan_id === activePlanId}
                  onClick={() => {
                    setActivePlanId(plan.plan_id!)
                    navigate(`/summary/${plan.plan_id}`)
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!activePlan ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-sm">Select a plan from the list, or create one in Plan Builder.</p>
            </div>
          ) : (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{activePlan.name ?? `Plan ${activePlan.plan_id}`}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {activePlan.target_meals} meals · {activePlan.target_servings} servings · {new Date(activePlan.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={deletePlan}>Delete plan</Button>
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
                          <div key={planRecipe.plan_recipe_id} className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-md">
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
                            <div key={planRecipe.plan_recipe_id} className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-md">
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
                            <div key={planRecipe.plan_recipe_id} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-md opacity-60">
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
