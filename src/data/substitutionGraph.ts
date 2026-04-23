import { db } from '../db/db'
import { SUBSTITUTION_PAIRS } from './substitutionPairs'

// Static adjacency map built from the pre-filtered ~1 500-pair library subset.
// Used as a fallback when the full MISKG table (miskgSubstitutions) hasn't been seeded.
export const subAdj = new Map<string, Set<string>>()

for (const [a, b] of SUBSTITUTION_PAIRS) {
  if (!subAdj.has(a)) subAdj.set(a, new Set())
  if (!subAdj.has(b)) subAdj.set(b, new Set())
  subAdj.get(a)!.add(b)
  subAdj.get(b)!.add(a)
}

// Returns the set of MISKG IDs that can substitute for `miskg_id`.
// Checks the full-DB table first (seeded from the 80k-pair MISKG dataset);
// falls back to the static pre-filtered subset if the table is empty.
export async function getSubstitutes(miskg_id: string): Promise<Set<string>> {
  const row = await db.miskgSubstitutions.get(miskg_id)
  if (row) return new Set(row.substitutes)
  return subAdj.get(miskg_id) ?? new Set()
}
