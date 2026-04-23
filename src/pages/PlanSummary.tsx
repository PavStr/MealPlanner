import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import type { Recipe, WeeklyPlan } from '../db/types'
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

// ── PlanCard ──────────────────────────────────────────────────────────────────

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
        active ? 'bg-blue-50 border border-blue-300 text-blue-900' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      <p className="font-medium">{plan.name ?? `Plan ${plan.plan_id}`}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {plan.target_meals} meals · {plan.target_servings} servings · {new Date(plan.created_at).toLocaleDateString()}
      </p>
    </button>
  )
}

// ── Shopping list section ─────────────────────────────────────────────────────

function ShoppingListSection({ list }: { list: ShoppingList }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(cat: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  if (list.categories.length === 0) {
    return <p className="text-sm text-gray-400 italic">No ingredient data. Add ingredients to your recipes in the library.</p>
  }

  return (
    <div className="space-y-3">
      {list.categories.map(cat => (
        <div key={cat} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(cat)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <span>{cat}</span>
            <span className="text-gray-400 text-xs">{collapsed.has(cat) ? 'Show' : 'Hide'}</span>
          </button>
          {!collapsed.has(cat) && (
            <ul className="divide-y divide-gray-100">
              {list.byCategory[cat].map(item => (
                <li key={item.ingredient_id} className="px-4 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800">{item.canonical_name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{item.entries.length} recipe{item.entries.length !== 1 ? 's' : ''}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {item.entries.map((e, i) => (
                      <li key={i} className="text-xs text-gray-500 flex gap-2">
                        <span className="text-gray-300">—</span>
                        <span>{e.raw_text}{e.optional ? ' (optional)' : ''}</span>
                        <span className="text-gray-300 italic">{e.recipe_title}</span>
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

// ── Consolidation suggestions ─────────────────────────────────────────────────

function ConsolidationPanel({ suggestions }: { suggestions: ConsolidationSuggestion[] }) {
  if (suggestions.length === 0) return null

  return (
    <div className="mb-5 border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-amber-100 border-b border-amber-200">
        <p className="text-sm font-semibold text-amber-900">
          Simplify your shop — {suggestions.length} swap{suggestions.length !== 1 ? 's' : ''} suggested
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          These ingredients are interchangeable. Using one throughout reduces what you need to buy.
        </p>
      </div>
      <ul className="divide-y divide-amber-100">
        {suggestions.map((s, i) => (
          <li key={i} className="px-4 py-3 flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-amber-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm text-gray-800">
                Use <strong>{s.keep}</strong> instead of <strong>{s.replace}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Swap in: {s.affectedRecipes.join(', ')}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Prep plan section ─────────────────────────────────────────────────────────

function PrepPlanSection({ tasks }: { tasks: PrepTask[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-gray-400 italic">No shared prep identified. Recipes share no common ingredients, or only one recipe is in the plan.</p>
  }
  return (
    <ul className="space-y-2">
      {tasks.map((task, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
          <div>
            <p className="text-sm text-gray-800">{task.description}</p>
            <p className="text-xs text-gray-400 mt-0.5">Used in: {task.recipes.join(', ')}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── PlanSummary (main) ────────────────────────────────────────────────────────

export default function PlanSummary() {
  const { planId: planIdParam } = useParams()
  const navigate = useNavigate()

  const plans = useLiveQuery(() => db.weeklyPlans.orderBy('created_at').reverse().toArray(), [])
  const [activePlanId, setActivePlanId] = useState<number | null>(null)

  const planRecipes = useLiveQuery(
    () => activePlanId != null ? db.weeklyPlanRecipes.where('plan_id').equals(activePlanId).toArray() : Promise.resolve([]),
    [activePlanId],
  )

  const [recipes, setRecipes] = useState<Map<number, Recipe>>(new Map())
  const [shoppingList, setShoppingList] = useState<ShoppingList>({ byCategory: {}, categories: [] })
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([])
  const [consolidations, setConsolidations] = useState<ConsolidationSuggestion[]>([])
  const [tab, setTab] = useState<'overview' | 'shopping' | 'prep'>('overview')

  // Resolve active plan from URL param or default to latest
  useEffect(() => {
    if (planIdParam) {
      setActivePlanId(parseInt(planIdParam))
    } else if (plans && plans.length > 0 && activePlanId === null) {
      setActivePlanId(plans[0].plan_id!)
    }
  }, [planIdParam, plans, activePlanId])

  // Load recipe details and generate lists when plan changes
  useEffect(() => {
    if (!planRecipes || planRecipes.length === 0) { setRecipes(new Map()); return }
    const ids = planRecipes.map(pr => pr.recipe_id)
    const finalIds = planRecipes.filter(pr => pr.role === 'anchor' || pr.role === 'final').map(pr => pr.recipe_id)

    Promise.all([
      db.recipes.bulkGet(ids),
      generateShoppingList(finalIds),
      generatePrepPlan(finalIds),
      generateConsolidationSuggestions(finalIds),
    ]).then(([recs, list, tasks, swaps]) => {
      const map = new Map<number, Recipe>()
      recs.forEach(r => { if (r?.recipe_id) map.set(r.recipe_id, r) })
      setRecipes(map)
      setShoppingList(list)
      setPrepTasks(tasks)
      setConsolidations(swaps)
    })
  }, [planRecipes])

  const activePlan = plans?.find(p => p.plan_id === activePlanId)
  const anchorRecipes = (planRecipes ?? []).filter(pr => pr.role === 'anchor')
  const finalRecipes = (planRecipes ?? []).filter(pr => pr.role === 'final')
  const suggestedOnly = (planRecipes ?? []).filter(pr => pr.role === 'suggested')

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
        {/* Plan list sidebar */}
        <div className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saved Plans</p>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {plans === undefined ? (
              <p className="text-sm text-gray-500 p-2">Loading…</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-gray-400 p-2">No saved plans yet. Build one in Plan Builder.</p>
            ) : (
              plans.map(p => (
                <PlanCard
                  key={p.plan_id}
                  plan={p}
                  active={p.plan_id === activePlanId}
                  onClick={() => { setActivePlanId(p.plan_id!); navigate(`/summary/${p.plan_id}`) }}
                />
              ))
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          {!activePlan ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-sm">Select a plan from the list, or create one in Plan Builder.</p>
            </div>
          ) : (
            <div className="space-y-5 max-w-3xl">
              {/* Plan header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{activePlan.name ?? `Plan ${activePlan.plan_id}`}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {activePlan.target_meals} meals · {activePlan.target_servings} servings ·{' '}
                    {new Date(activePlan.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={deletePlan}>Delete plan</Button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 gap-0">
                {(['overview', 'shopping', 'prep'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                      tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {t === 'shopping' ? 'Shopping List' : t === 'prep' ? 'Prep Plan' : 'Overview'}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Anchor Recipes</p>
                    <div className="space-y-1.5">
                      {anchorRecipes.map(pr => {
                        const r = recipes.get(pr.recipe_id)
                        return r ? (
                          <div key={pr.plan_recipe_id} className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-md">
                            <Badge color="blue">Anchor</Badge>
                            <span className="text-sm text-gray-800 font-medium">{r.title}</span>
                            <span className="text-xs text-gray-400 ml-auto">{r.default_servings} srv</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                  {finalRecipes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Added from Suggestions</p>
                      <div className="space-y-1.5">
                        {finalRecipes.map(pr => {
                          const r = recipes.get(pr.recipe_id)
                          return r ? (
                            <div key={pr.plan_recipe_id} className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-md">
                              <Badge color="green">Suggested</Badge>
                              <span className="text-sm text-gray-800 font-medium">{r.title}</span>
                              <span className="text-xs text-gray-400 ml-auto">{r.default_servings} srv</span>
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
                        {suggestedOnly.map(pr => {
                          const r = recipes.get(pr.recipe_id)
                          return r ? (
                            <div key={pr.plan_recipe_id} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-md opacity-60">
                              <Badge>Skipped</Badge>
                              <span className="text-sm text-gray-600">{r.title}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
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
