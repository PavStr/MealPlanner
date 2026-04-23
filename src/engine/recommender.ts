import { db } from '../db/db'
import type { Recipe, Ingredient } from '../db/types'
import { SIMILARITY_WEIGHTS } from '../data/ingredientLibrary'

export interface RecommendationResult {
  recipe: Recipe
  score: number
  exactOverlap: number
  normalizedOverlap: number
  familyOverlap: number
  newIngredientCount: number
  sharedIngredientNames: string[]
  newIngredientNames: string[]
  explanation: string[]
}

// Top-level scoring weights — must sum to 1.0
const W = {
  ingredientReuse: 0.60,
  cost:            0.15, // placeholder — Phase 2
  nutrition:       0.25, // placeholder — Phase 2
}

interface AnchorProfile {
  idSet: Set<number>
  normalizedSet: Set<string>
  familySet: Set<string>
}

async function buildAnchorProfile(anchorRecipeIds: number[]): Promise<AnchorProfile> {
  const items = await db.recipeIngredients
    .where('recipe_id')
    .anyOf(anchorRecipeIds)
    .toArray()

  const uniqueIngredientIds = [...new Set(items.map(i => i.ingredient_id))]
  const ingredients = (await db.ingredients.bulkGet(uniqueIngredientIds)).filter(Boolean) as Ingredient[]

  return {
    idSet:         new Set(uniqueIngredientIds),
    normalizedSet: new Set(ingredients.map(i => i.normalized_name)),
    familySet:     new Set(ingredients.map(i => i.ingredient_family).filter(Boolean) as string[]),
  }
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
    r => r.recipe_id != null && !anchorRecipeIds.includes(r.recipe_id!),
  )

  const scored: RecommendationResult[] = []

  for (const candidate of candidates) {
    if (candidate.recipe_id == null) continue

    const candidateItems = await db.recipeIngredients
      .where('recipe_id')
      .equals(candidate.recipe_id)
      .toArray()

    if (candidateItems.length === 0) continue

    const ingredientIds = candidateItems.map(i => i.ingredient_id)
    const ingredients = (await db.ingredients.bulkGet(ingredientIds)) as (Ingredient | undefined)[]

    let exactOverlap      = 0
    let normalizedOverlap = 0
    let familyOverlap     = 0
    let newIngredientCount = 0
    const sharedIngredientNames: string[] = []
    const newIngredientNames:    string[] = []

    for (let i = 0; i < candidateItems.length; i++) {
      const ing = ingredients[i]
      if (!ing) continue
      const ingId = candidateItems[i].ingredient_id

      if (anchor.idSet.has(ingId)) {
        // Exact ingredient match — full credit
        exactOverlap++
        sharedIngredientNames.push(ing.canonical_name)
      } else if (anchor.normalizedSet.has(ing.normalized_name)) {
        // Same base ingredient, different form (e.g. rødløk vs gul løk)
        normalizedOverlap++
        sharedIngredientNames.push(`${ing.canonical_name} (lignende)`)
      } else if (ing.ingredient_family && anchor.familySet.has(ing.ingredient_family)) {
        // Same culinary family (e.g. brokkoli vs blomkål — both kålvekst)
        familyOverlap++
        // family matches get partial credit but are not shown as "shared" to keep UI clean
      } else {
        newIngredientCount++
        newIngredientNames.push(ing.canonical_name)
      }
    }

    const total = candidateItems.length

    // Weighted overlap score (0–1 range before penalty)
    const overlapScore =
      (exactOverlap      * SIMILARITY_WEIGHTS.exact       +
       normalizedOverlap * SIMILARITY_WEIGHTS.normalized  +
       familyOverlap     * SIMILARITY_WEIGHTS.family) / total

    const newRatio        = newIngredientCount / total
    const ingredientScore = overlapScore - SIMILARITY_WEIGHTS.new_penalty * newRatio

    // Cost and nutrition — neutral placeholders until Phase 2
    const costScore      = 0.5
    const nutritionScore = 0.5

    const finalScore =
      W.ingredientReuse * ingredientScore +
      W.cost            * costScore       +
      W.nutrition       * nutritionScore

    // Build human-readable explanation
    const explanation: string[] = []
    if (exactOverlap > 0) {
      explanation.push(
        `Deler ${exactOverlap} ingrediens${exactOverlap !== 1 ? 'er' : ''} med valgte oppskrifter`,
      )
    }
    if (normalizedOverlap > 0) {
      explanation.push(
        `${normalizedOverlap} lignende ingrediens${normalizedOverlap !== 1 ? 'er' : ''} (f.eks. annen variant av samme råvare)`,
      )
    }
    if (familyOverlap > 0) {
      explanation.push(
        `${familyOverlap} ingrediens${familyOverlap !== 1 ? 'er' : ''} fra samme råvarefamilie`,
      )
    }
    if (exactOverlap + normalizedOverlap + familyOverlap === 0) {
      explanation.push('Ingen felles ingredienser med valgte oppskrifter')
    }
    explanation.push(
      `Legger til ${newIngredientCount} nye ingredienstype${newIngredientCount !== 1 ? 'r' : ''}`,
    )

    scored.push({
      recipe: candidate,
      score: finalScore,
      exactOverlap,
      normalizedOverlap,
      familyOverlap,
      newIngredientCount,
      sharedIngredientNames,
      newIngredientNames,
      explanation,
    })
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, count)
}
