import { db } from '../db/db'
import type { Ingredient, RecipeIngredient, RecipeNutrition } from '../db/types'
import { NUTRITION_DATA, type NutrientEntry } from '../data/nutritionData'

async function getNutrientData(miskg_id: string): Promise<NutrientEntry | null> {
  const row = await db.miskgNutrition.get(miskg_id)
  if (row) return { kcal: row.kcal, protein: row.protein, fat: row.fat, carbs: row.carbs, fiber: row.fiber }
  return NUTRITION_DATA[miskg_id] ?? null
}

const DEFAULT_GRAMS_FALLBACK = 100
const OIL_DENSITY_G_PER_ML = 0.8

const DEFAULT_PIECE_WEIGHTS: Record<string, number> = {
  allspice: 1,
  avocado: 150,
  'bay leaf': 1,
  'bell pepper': 150,
  bok: 250,
  broccoli: 300,
  'brussels sprouts': 20,
  cabbage: 900,
  carrot: 70,
  cauliflower: 600,
  celery: 40,
  chili: 15,
  corn: 120,
  cucumber: 300,
  eggplant: 300,
  fennel: 250,
  garlic: 5,
  kohlrabi: 250,
  lamb: 180,
  leek: 180,
  lemon: 120,
  lime: 70,
  mango: 250,
  mushroom: 20,
  nutmeg: 5,
  onion: 150,
  orange: 160,
  parsnip: 120,
  pepper: 150,
  pineapple: 900,
  potato: 180,
  'pork chop': 180,
  sausage: 80,
  shallot: 35,
  'spring onion': 15,
  'stock cube': 10,
  tomato: 120,
  zucchini: 200,
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function normalizeUnit(unit?: string): string | undefined {
  const normalized = unit?.toLowerCase().trim()
  if (!normalized) return undefined

  const aliases: Record<string, string> = {
    cloves: 'clove',
    deciliter: 'dl',
    deciliters: 'dl',
    gram: 'g',
    grams: 'g',
    kilogram: 'kg',
    kilograms: 'kg',
    liter: 'l',
    liters: 'l',
    litre: 'l',
    litres: 'l',
    pieces: 'piece',
    pcs: 'piece',
    tablespoons: 'tbsp',
    tablespoon: 'tbsp',
    teaspoons: 'tsp',
    teaspoon: 'tsp',
  }

  return aliases[normalized] ?? normalized
}

function isOilIngredient(ingredient: Ingredient): boolean {
  const name = `${ingredient.canonical_name} ${ingredient.normalized_name}`.toLowerCase()
  return name.includes('oil')
}

function guessPieceWeight(ingredient: Ingredient): number {
  const names = [ingredient.canonical_name, ingredient.normalized_name]
    .filter(Boolean)
    .map(name => name.toLowerCase())

  for (const name of names) {
    if (name in DEFAULT_PIECE_WEIGHTS) return DEFAULT_PIECE_WEIGHTS[name]
  }

  for (const name of names) {
    const matchedKey = Object.keys(DEFAULT_PIECE_WEIGHTS).find(key => name.includes(key))
    if (matchedKey) return DEFAULT_PIECE_WEIGHTS[matchedKey]
  }

  return DEFAULT_GRAMS_FALLBACK
}

function estimateIngredientGrams(recipeIngredient: RecipeIngredient, ingredient: Ingredient): number {
  if (recipeIngredient.quantity == null) return DEFAULT_GRAMS_FALLBACK

  const quantity = Math.max(recipeIngredient.quantity, 0)
  const unit = normalizeUnit(recipeIngredient.unit ?? ingredient.default_unit)
  const density = isOilIngredient(ingredient) ? OIL_DENSITY_G_PER_ML : 1

  switch (unit) {
    case 'g':
      return quantity
    case 'kg':
      return quantity * 1000
    case 'mg':
      return quantity / 1000
    case 'ml':
      return quantity * density
    case 'dl':
      return quantity * 100 * density
    case 'l':
      return quantity * 1000 * density
    case 'tbsp':
      return quantity * 15
    case 'tsp':
      return quantity * 5
    case 'clove':
      return quantity * 5
    case 'piece':
      return quantity * guessPieceWeight(ingredient)
    default:
      return DEFAULT_GRAMS_FALLBACK
  }
}

export async function computeRecipeNutrition(recipeId: number): Promise<RecipeNutrition | null> {
  const recipe = await db.recipes.get(recipeId)
  if (!recipe) return null

  const items = await db.recipeIngredients
    .where('recipe_id')
    .equals(recipeId)
    .toArray()

  if (items.length === 0) return null

  const ingredientIds = [...new Set(items.map(item => item.ingredient_id))]
  const ingredients = (await db.ingredients.bulkGet(ingredientIds)).filter(Boolean) as Ingredient[]
  const ingredientById = new Map(ingredients.map(ingredient => [ingredient.ingredient_id!, ingredient]))

  let calories = 0
  let protein = 0
  let fat = 0
  let carbs = 0
  let fiber = 0
  let usedEntries = 0

  for (const item of items) {
    const ingredient = ingredientById.get(item.ingredient_id)
    if (!ingredient?.miskg_id) continue

    const nutrients = await getNutrientData(ingredient.miskg_id)
    if (!nutrients) continue

    const grams = estimateIngredientGrams(item, ingredient)
    if (grams <= 0) continue

    usedEntries++
    calories += (nutrients.kcal / 100) * grams
    protein += (nutrients.protein / 100) * grams
    fat += (nutrients.fat / 100) * grams
    carbs += (nutrients.carbs / 100) * grams
    fiber += (nutrients.fiber / 100) * grams
  }

  if (usedEntries === 0) return null

  const servings = Math.max(recipe.default_servings || 1, 1)
  return {
    recipe_id: recipeId,
    calories_per_serving: round(calories / servings, 0),
    protein_g: round(protein / servings, 1),
    fat_g: round(fat / servings, 1),
    carbs_g: round(carbs / servings, 1),
    fiber_g: round(fiber / servings, 1),
    nutrition_confidence: 'estimated',
  }
}

export async function seedRecipeNutrition(recipeIds: number[]): Promise<void> {
  const uniqueRecipeIds = [...new Set(recipeIds)]

  for (const recipeId of uniqueRecipeIds) {
    const nutrition = await computeRecipeNutrition(recipeId)

    if (nutrition) {
      await db.recipeNutrition.put(nutrition)
    } else {
      await db.recipeNutrition.delete(recipeId)
    }
  }
}

export async function backfillMissingRecipeNutrition(): Promise<void> {
  const [recipes, nutritionRows] = await Promise.all([
    db.recipes.toArray(),
    db.recipeNutrition.toArray(),
  ])

  const existing = new Set(nutritionRows.map(row => row.recipe_id))
  const missingRecipeIds = recipes
    .map(recipe => recipe.recipe_id)
    .filter((recipeId): recipeId is number => recipeId != null && !existing.has(recipeId))

  if (missingRecipeIds.length > 0) {
    await seedRecipeNutrition(missingRecipeIds)
  }
}

export function nutritionScore(rn: RecipeNutrition | null): number {
  if (!rn) return 0.5

  const proteinScore = Math.min((rn.protein_g ?? 0) / 20, 1)
  const fiberScore = Math.min((rn.fiber_g ?? 0) / 8, 1)
  const calories = rn.calories_per_serving ?? 0

  let calorieScore = 1
  if (calories > 900) {
    calorieScore = Math.max(0, 1 - Math.min((calories - 900) / 600, 1))
  }

  return round(
    proteinScore * 0.45 +
    fiberScore * 0.35 +
    calorieScore * 0.20,
    3,
  )
}
