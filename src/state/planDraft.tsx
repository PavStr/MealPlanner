import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { RecommendationResult } from '../engine/recommender'

const STORAGE_KEY = 'meal-planner.plan-draft'

export interface PlanDraft {
  targetMeals: number
  targetServings: number
  anchorIds: number[]
  recommendations: RecommendationResult[]
  includedIds: number[]
  ran: boolean
  updatedAt: number
}

interface PlanDraftContextValue {
  draft: PlanDraft | null
  setDraft: (draft: PlanDraft | null) => void
  clearDraft: () => void
}

const PlanDraftContext = createContext<PlanDraftContextValue | null>(null)

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isFiniteNumber)
}

function isRecommendationResult(value: unknown): value is RecommendationResult {
  if (!value || typeof value !== 'object') return false

  const recipeId = (value as RecommendationResult).recipe?.recipe_id
  return isFiniteNumber(recipeId)
}

function hasUsableDraft(draft: PlanDraft | null): draft is PlanDraft {
  return Boolean(draft && draft.anchorIds.length > 0)
}

function parseStoredDraft(value: unknown): PlanDraft | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Partial<PlanDraft>
  if (!isNumberArray(record.anchorIds)) return null

  return {
    targetMeals: isFiniteNumber(record.targetMeals) ? record.targetMeals : 4,
    targetServings: isFiniteNumber(record.targetServings) ? record.targetServings : 2,
    anchorIds: record.anchorIds,
    recommendations: Array.isArray(record.recommendations)
      ? record.recommendations.filter(isRecommendationResult)
      : [],
    includedIds: isNumberArray(record.includedIds) ? record.includedIds : [],
    ran: Boolean(record.ran),
    updatedAt: isFiniteNumber(record.updatedAt) ? record.updatedAt : Date.now(),
  }
}

function loadDraftFromStorage(): PlanDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseStoredDraft(JSON.parse(raw))
  } catch {
    return null
  }
}

export function PlanDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<PlanDraft | null>(() => loadDraftFromStorage())

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!hasUsableDraft(draft)) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft])

  const value = useMemo<PlanDraftContextValue>(() => ({
    draft: hasUsableDraft(draft) ? draft : null,
    setDraft,
    clearDraft: () => setDraft(null),
  }), [draft])

  return (
    <PlanDraftContext.Provider value={value}>
      {children}
    </PlanDraftContext.Provider>
  )
}

export function usePlanDraft() {
  const context = useContext(PlanDraftContext)

  if (!context) {
    throw new Error('usePlanDraft must be used within a PlanDraftProvider')
  }

  return context
}
