import Dexie, { type Table } from 'dexie'
import type {
  Recipe,
  Ingredient,
  RecipeIngredient,
  RecipeNutrition,
  RecipeCost,
  IngredientAlias,
  IngredientSimilarity,
  WeeklyPlan,
  WeeklyPlanRecipe,
} from './types'

class MealPlannerDB extends Dexie {
  recipes!: Table<Recipe, number>
  ingredients!: Table<Ingredient, number>
  recipeIngredients!: Table<RecipeIngredient, number>
  recipeNutrition!: Table<RecipeNutrition, number>
  recipeCosts!: Table<RecipeCost, number>
  ingredientAliases!: Table<IngredientAlias, number>
  ingredientSimilarities!: Table<IngredientSimilarity, [number, number]>
  weeklyPlans!: Table<WeeklyPlan, number>
  weeklyPlanRecipes!: Table<WeeklyPlanRecipe, number>

  constructor() {
    super('MealPlannerDB')
    this.version(1).stores({
      recipes: '++recipe_id, title, status, *tags',
      ingredients: '++ingredient_id, canonical_name, normalized_name, ingredient_family, category',
      recipeIngredients: '++recipe_ingredient_id, recipe_id, ingredient_id',
      recipeNutrition: 'recipe_id',
      recipeCosts: 'recipe_id',
      ingredientAliases: '++alias_id, alias_text, ingredient_id',
      ingredientSimilarities: '[ingredient_a_id+ingredient_b_id], ingredient_a_id, ingredient_b_id',
      weeklyPlans: '++plan_id',
      weeklyPlanRecipes: '++plan_recipe_id, plan_id, recipe_id, role',
    })
  }
}

export const db = new MealPlannerDB()
