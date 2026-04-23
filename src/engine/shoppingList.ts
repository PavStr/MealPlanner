import { db } from '../db/db'

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

export interface PrepTask {
  description: string
  recipes: string[]
  ingredient: string
}

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
