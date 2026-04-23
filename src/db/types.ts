export type RecipeStatus = 'draft' | 'review' | 'active' | 'archived'
export type NutritionConfidence = 'high' | 'medium' | 'low' | 'estimated'
export type CostConfidence = 'high' | 'medium' | 'low' | 'estimated'
export type SimilarityType = 'exact' | 'normalized' | 'family'
export type PlanRecipeRole = 'anchor' | 'suggested' | 'final'
export type SourceType = 'manual' | 'import' | 'gpt' | 'url'

export interface Recipe {
  recipe_id?: number
  title: string
  description?: string
  default_servings: number
  prep_time_min?: number
  cook_time_min?: number
  total_time_min?: number
  instructions?: string
  source_type?: SourceType
  source_reference?: string
  status: RecipeStatus
  tags?: string[]
  created_at: number
  updated_at: number
}

export interface Ingredient {
  ingredient_id?: number
  canonical_name: string
  normalized_name: string
  ingredient_family?: string
  category?: string
  default_unit?: string
  cost_reference_unit?: string
  nutrition_reference_unit?: string
}

export interface RecipeIngredient {
  recipe_ingredient_id?: number
  recipe_id: number
  ingredient_id: number
  raw_text: string
  quantity?: number
  unit?: string
  prep_note?: string
  role?: string
  optional_flag?: boolean
}

export interface RecipeNutrition {
  recipe_id: number
  calories_per_serving?: number
  protein_g?: number
  fat_g?: number
  carbs_g?: number
  fiber_g?: number
  vegetable_portions?: number
  nutrition_confidence?: NutritionConfidence
}

export interface RecipeCost {
  recipe_id: number
  estimated_cost_total?: number
  estimated_cost_per_serving?: number
  cost_confidence?: CostConfidence
  price_basis_date?: number
}

export interface IngredientAlias {
  alias_id?: number
  alias_text: string
  ingredient_id: number
  confidence?: number
}

export interface IngredientSimilarity {
  ingredient_a_id: number
  ingredient_b_id: number
  similarity_type: SimilarityType
  weight: number
}

export interface WeeklyPlan {
  plan_id?: number
  name?: string
  target_meals: number
  target_servings: number
  created_at: number
  updated_at: number
}

export interface WeeklyPlanRecipe {
  plan_recipe_id?: number
  plan_id: number
  recipe_id: number
  role: PlanRecipeRole
  rank?: number
}
