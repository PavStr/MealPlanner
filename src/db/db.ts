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
  MiskgSubstitution,
  MiskgNutrition,
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
  miskgSubstitutions!: Table<MiskgSubstitution, string>
  miskgNutrition!: Table<MiskgNutrition, string>

  constructor() {
    super('MealPlannerDB')
    this.version(2).stores({
      recipes: '++recipe_id, title, status, *tags',
      ingredients: '++ingredient_id, canonical_name, normalized_name, ingredient_family, category, miskg_id',
      recipeIngredients: '++recipe_ingredient_id, recipe_id, ingredient_id',
      recipeNutrition: 'recipe_id',
      recipeCosts: 'recipe_id',
      ingredientAliases: '++alias_id, alias_text, ingredient_id',
      ingredientSimilarities: '[ingredient_a_id+ingredient_b_id], ingredient_a_id, ingredient_b_id',
      weeklyPlans: '++plan_id',
      weeklyPlanRecipes: '++plan_recipe_id, plan_id, recipe_id, role',
    })
    this.version(3).stores({
      miskgSubstitutions: 'miskg_id',
      miskgNutrition: 'miskg_id',
    })
  }
}

export const db = new MealPlannerDB()
