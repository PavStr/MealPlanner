import { db } from '../db/db'
import type { Ingredient } from '../db/types'

export function normalizeIngredientName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

export async function resolveOrCreateIngredient(name: string): Promise<number> {
  const canonical = name.trim()
  const normalized = normalizeIngredientName(canonical)

  const canonicalMatch = await db.ingredients
    .where('canonical_name')
    .equalsIgnoreCase(canonical)
    .first()

  if (canonicalMatch?.ingredient_id != null) return canonicalMatch.ingredient_id

  const normalizedMatch = await db.ingredients
    .where('normalized_name')
    .equals(normalized)
    .first()

  if (normalizedMatch?.ingredient_id != null) return normalizedMatch.ingredient_id

  return db.ingredients.add({
    canonical_name: canonical,
    normalized_name: normalized,
  } as Ingredient)
}
