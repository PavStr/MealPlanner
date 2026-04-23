import { db } from '../db/db'
import { SUBSTITUTION_PAIRS } from '../data/substitutionPairs'

// ---------------------------------------------------------------------------
// Build substitution adjacency once at module load (1 515 pairs, fast)
// ---------------------------------------------------------------------------

const subAdj = new Map<string, Set<string>>()
for (const [a, b] of SUBSTITUTION_PAIRS) {
  if (!subAdj.has(a)) subAdj.set(a, new Set())
  if (!subAdj.has(b)) subAdj.set(b, new Set())
  subAdj.get(a)!.add(b)
  subAdj.get(b)!.add(a)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShoppingEntry {
  recipe_title: string
  raw_text: string
  quantity?: number
  unit?: string
  optional: boolean
}

export interface ShoppingItem {
  ingredient_id: number
  canonical_name: string
  category: string
  entries: ShoppingEntry[]
}

export interface ShoppingList {
  byCategory: Record<string, ShoppingItem[]>
  categories: string[]
}

export interface ConsolidationSuggestion {
  keep: string            // canonical name to keep (appears most)
  replace: string         // canonical name to drop
  affectedRecipes: string[] // recipes where the swap would happen
}

export interface PrepTask {
  description: string
  recipes: string[]
  ingredient: string
}

// ---------------------------------------------------------------------------
// Shopping list
// ---------------------------------------------------------------------------

export async function generateShoppingList(recipeIds: number[]): Promise<ShoppingList> {
  if (recipeIds.length === 0) return { byCategory: {}, categories: [] }

  const itemMap = new Map<number, ShoppingItem>()

  for (const recipeId of recipeIds) {
    const [recipe, recipeIngredients] = await Promise.all([
      db.recipes.get(recipeId),
      db.recipeIngredients.where('recipe_id').equals(recipeId).toArray(),
    ])
    if (!recipe) continue

    for (const ri of recipeIngredients) {
      const ingredient = await db.ingredients.get(ri.ingredient_id)
      if (!ingredient) continue

      if (!itemMap.has(ri.ingredient_id)) {
        itemMap.set(ri.ingredient_id, {
          ingredient_id: ri.ingredient_id,
          canonical_name: ingredient.canonical_name,
          category: ingredient.category ?? 'Uncategorized',
          entries: [],
        })
      }

      itemMap.get(ri.ingredient_id)!.entries.push({
        recipe_title: recipe.title,
        raw_text: ri.raw_text,
        quantity: ri.quantity,
        unit: ri.unit,
        optional: ri.optional_flag ?? false,
      })
    }
  }

  const byCategory: Record<string, ShoppingItem[]> = {}
  for (const item of itemMap.values()) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  }

  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name))
  }

  const categories = Object.keys(byCategory).sort((a, b) => {
    if (a === 'Uncategorized') return 1
    if (b === 'Uncategorized') return -1
    return a.localeCompare(b)
  })

  return { byCategory, categories }
}

// ---------------------------------------------------------------------------
// Consolidation suggestions
// Find ingredients in the plan that are MISKG-substitutable with each other,
// then suggest replacing the minority ingredient with the dominant one.
// ---------------------------------------------------------------------------

export async function generateConsolidationSuggestions(
  recipeIds: number[],
): Promise<ConsolidationSuggestion[]> {
  if (recipeIds.length < 2) return []

  // Collect every ingredient in the plan with its miskg_id and which recipes use it
  interface PlanIngredient {
    ingredientId: number
    name: string
    miskg_id: string
    recipeNames: string[]
  }

  const byIngredient = new Map<number, PlanIngredient>()

  for (const recipeId of recipeIds) {
    const [recipe, items] = await Promise.all([
      db.recipes.get(recipeId),
      db.recipeIngredients.where('recipe_id').equals(recipeId).toArray(),
    ])
    if (!recipe) continue

    for (const ri of items) {
      const ing = await db.ingredients.get(ri.ingredient_id)
      if (!ing?.miskg_id) continue

      if (!byIngredient.has(ri.ingredient_id)) {
        byIngredient.set(ri.ingredient_id, {
          ingredientId: ri.ingredient_id,
          name: ing.canonical_name,
          miskg_id: ing.miskg_id,
          recipeNames: [],
        })
      }
      byIngredient.get(ri.ingredient_id)!.recipeNames.push(recipe.title)
    }
  }

  const planIngredients = [...byIngredient.values()]
  // miskg_id → PlanIngredient for quick lookup
  const byMisgkId = new Map(planIngredients.map(i => [i.miskg_id, i]))

  // For each pair of plan ingredients connected by a substitution edge,
  // generate a suggestion if one clearly outnumbers the other.
  const suggestions: ConsolidationSuggestion[] = []
  const handled = new Set<string>() // avoid duplicate pair suggestions

  for (const ing of planIngredients) {
    const neighbours = subAdj.get(ing.miskg_id)
    if (!neighbours) continue

    for (const neighbourId of neighbours) {
      const neighbour = byMisgkId.get(neighbourId)
      if (!neighbour) continue // not in this plan

      const pairKey = [ing.miskg_id, neighbourId].sort().join('|')
      if (handled.has(pairKey)) continue
      handled.add(pairKey)

      // Skip if they appear in the same recipes — no shopping benefit
      const ingRecipes   = new Set(ing.recipeNames)
      const neighRecipes = new Set(neighbour.recipeNames)
      const overlap = [...neighRecipes].filter(r => ingRecipes.has(r))
      if (overlap.length === neighRecipes.size && overlap.length === ingRecipes.size) continue

      // Pick winner = more recipes; loser = fewer recipes
      const [winner, loser] =
        ing.recipeNames.length >= neighbour.recipeNames.length
          ? [ing, neighbour]
          : [neighbour, ing]

      // Only suggest when the loser adds at least one distinct shopping item
      // (i.e. it doesn't already appear in all the same recipes as the winner)
      const loserOnlyRecipes = loser.recipeNames.filter(r => !winner.recipeNames.includes(r))
      if (loserOnlyRecipes.length === 0) continue

      suggestions.push({
        keep:           winner.name,
        replace:        loser.name,
        affectedRecipes: loserOnlyRecipes,
      })
    }
  }

  // Sort by number of recipes simplified, most impactful first
  return suggestions.sort((a, b) => b.affectedRecipes.length - a.affectedRecipes.length)
}

// ---------------------------------------------------------------------------
// Prep plan
// ---------------------------------------------------------------------------

export async function generatePrepPlan(recipeIds: number[]): Promise<PrepTask[]> {
  if (recipeIds.length < 2) return []

  const ingredientRecipes = new Map<number, string[]>()

  for (const recipeId of recipeIds) {
    const [recipe, items] = await Promise.all([
      db.recipes.get(recipeId),
      db.recipeIngredients.where('recipe_id').equals(recipeId).toArray(),
    ])
    if (!recipe) continue

    for (const ri of items) {
      if (!ingredientRecipes.has(ri.ingredient_id)) {
        ingredientRecipes.set(ri.ingredient_id, [])
      }
      ingredientRecipes.get(ri.ingredient_id)!.push(recipe.title)
    }
  }

  const tasks: PrepTask[] = []

  for (const [ingredientId, recipeNames] of ingredientRecipes.entries()) {
    if (recipeNames.length < 2) continue
    const ingredient = await db.ingredients.get(ingredientId)
    if (!ingredient) continue

    tasks.push({
      ingredient: ingredient.canonical_name,
      recipes: recipeNames,
      description: `Prep ${ingredient.canonical_name} once for ${recipeNames.length} meals`,
    })
  }

  return tasks.sort((a, b) => b.recipes.length - a.recipes.length)
}
