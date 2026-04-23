import { SUBSTITUTION_PAIRS } from './substitutionPairs'

export const subAdj = new Map<string, Set<string>>()

for (const [a, b] of SUBSTITUTION_PAIRS) {
  if (!subAdj.has(a)) subAdj.set(a, new Set())
  if (!subAdj.has(b)) subAdj.set(b, new Set())
  subAdj.get(a)!.add(b)
  subAdj.get(b)!.add(a)
}
