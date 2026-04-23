import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { seedIngredients, seedIngredientSimilarities } from '../../data/ingredientLibrary'
import { backfillMissingRecipeNutrition } from '../../engine/nutrition'

export default function Layout() {
  const seededRef = useRef(false)

  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true

    void (async () => {
      try {
        await seedIngredients()
        await seedIngredientSimilarities()
        await backfillMissingRecipeNutrition()
      } catch (error) {
        console.error('Failed to seed MealPlanner data', error)
      }
    })()
  }, [])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
