import { db } from '../db/db'
import type { Recipe, Ingredient } from '../db/types'
import { SIMILARITY_WEIGHTS } from '../data/ingredientLibrary'
import { subAdj } from '../data/substitutionGraph'
import { nutritionScore as nutritionScoreFn } from './nutrition'

export interface RecommendationResult {
  recipe: Recipe
  score: number
  exactOverlap: number
  normalizedOverlap: number
  substitutionOverlap: number
  familyOverlap: number
  newIngredientCount: number
  sharedIngredientNames: string[]
  newIngredientNames: string[]
  explanation: string[]
}

const W = {
  ingredientReuse: 0.60,
  cost: 0.15,
  nutrition: 0.25,
}

interface AnchorProfile {
  idSet: Set<number>
  normalizedSet: Set<string>
  familySet: Set<string>
  miskgIdSet: Set<string>
}

async function buildAnchorProfile(anchorRecipeIds: number[]): Promise<AnchorProfile> {
  const items = await db.recipeIngredients
    .where('recipe_id')
    .anyOf(anchorRecipeIds)
    .toArray()

  const uniqueIngredientIds = [...new Set(items.map(i => i.ingredient_id))]
  const ingredients = (await db.ingredients.bulkGet(uniqueIngredientIds)).filter(Boolean) as Ingredient[]

  return {
    idSet: new Set(uniqueIngredientIds),
    normalizedSet: new Set(ingredients.map(i => i.normalized_name)),
    familySet: new Set(ingredients.map(i => i.ingredient_family).filter(Boolean) as string[]),
    miskgIdSet: new Set(ingredients.map(i => i.miskg_id).filter(Boolean) as string[]),
  }
}

function hasSubstitutionOverlap(miskgId: string, anchorMiskgIds: Set<string>): boolean {
  const neighbours = subAdj.get(miskgId)
  if (!neighbours) return false

  for (const neighbour of neighbours) {
    if (anchorMiskgIds.has(neighbour)) return true
  }

  return false
}

export async function getRecommendations(
  anchorRecipeIds: number[],
  count = 3,
): Promise<RecommendationResult[]> {
  if (anchorRecipeIds.length === 0) return []

  const [allRecipes, anchor] = await Promise.all([
    db.recipes.where('status').equals('active').toArray(),
    buildAnchorProfile(anchorRecipeIds),
  ])

  const candidates = allRecipes.filter(
    recipe => recipe.recipe_id != null && !anchorRecipeIds.includes(recipe.recipe_id!),
  )

  const scored: RecommendationResult[] = []

  for (const candidate of candidates) {
    if (candidate.recipe_id == null) continue

    const [candidateItems, recipeNutrition] = await Promise.all([
      db.recipeIngredients.where('recipe_id').equals(candidate.recipe_id).toArray(),
      db.recipeNutrition.get(candidate.recipe_id),
    ])

    if (candidateItems.length === 0) continue

    const ingredientIds = candidateItems.map(item => item.ingredient_id)
    const ingredients = await db.ingredients.bulkGet(ingredientIds)

    let exactOverlap = 0
    let normalizedOverlap = 0
    let substitutionOverlap = 0
    let familyOverlap = 0
    let newIngredientCount = 0
    const sharedIngredientNames: string[] = []
    const newIngredientNames: string[] = []

    for (let i = 0; i < candidateItems.length; i++) {
      const ingredient = ingredients[i]
      if (!ingredient) continue

      const ingredientId = candidateItems[i].ingredient_id

      if (anchor.idSet.has(ingredientId)) {
        exactOverlap++
        sharedIngredientNames.push(ingredient.canonical_name)
      } else if (anchor.normalizedSet.has(ingredient.normalized_name)) {
        normalizedOverlap++
        sharedIngredientNames.push(`${ingredient.canonical_name} (similar)`)
      } else if (
        ingredient.miskg_id &&
        hasSubstitutionOverlap(ingredient.miskg_id, anchor.miskgIdSet)
      ) {
        substitutionOverlap++
        sharedIngredientNames.push(`${ingredient.canonical_name} (interchangeable)`)
      } else if (ingredient.ingredient_family && anchor.familySet.has(ingredient.ingredient_family)) {
        familyOverlap++
      } else {
        newIngredientCount++
        newIngredientNames.push(ingredient.canonical_name)
      }
    }

    const total = candidateItems.length
    const overlapScore =
      (exactOverlap * SIMILARITY_WEIGHTS.exact +
       normalizedOverlap * SIMILARITY_WEIGHTS.normalized +
       substitutionOverlap * SIMILARITY_WEIGHTS.substitution +
       familyOverlap * SIMILARITY_WEIGHTS.family) / total

    const newRatio = newIngredientCount / total
    const ingredientScore = overlapScore - SIMILARITY_WEIGHTS.new_penalty * newRatio
    const costScore = 0.5
    const nutritionScore = nutritionScoreFn(recipeNutrition ?? null)

    const finalScore =
      W.ingredientReuse * ingredientScore +
      W.cost * costScore +
      W.nutrition * nutritionScore

    const explanation: string[] = []
    if (exactOverlap > 0) {
      explanation.push(
        `Shares ${exactOverlap} ingredient${exactOverlap !== 1 ? 's' : ''} with your selected recipes`,
      )
    }
    if (normalizedOverlap > 0) {
      explanation.push(
        `${normalizedOverlap} similar ingredient${normalizedOverlap !== 1 ? 's' : ''} (same base ingredient)`,
      )
    }
    if (substitutionOverlap > 0) {
      explanation.push(
        `${substitutionOverlap} substitutable ingredient${substitutionOverlap !== 1 ? 's' : ''} from MISKG`,
      )
    }
    if (familyOverlap > 0) {
      explanation.push(
        `${familyOverlap} ingredient${familyOverlap !== 1 ? 's' : ''} from the same ingredient family`,
      )
    }
    if (exactOverlap + normalizedOverlap + substitutionOverlap + familyOverlap === 0) {
      explanation.push('No ingredient overlap with the selected recipes')
    }
    explanation.push(
      `Adds ${newIngredientCount} new ingredient type${newIngredientCount !== 1 ? 's' : ''}`,
    )

    scored.push({
      recipe: candidate,
      score: finalScore,
      exactOverlap,
      normalizedOverlap,
      substitutionOverlap,
      familyOverlap,
      newIngredientCount,
      sharedIngredientNames,
      newIngredientNames,
      explanation,
    })
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, count)
}
