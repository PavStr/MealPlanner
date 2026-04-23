import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Update base to match your GitHub repository name if different from 'MealPlanner'
export default defineConfig({
  plugins: [react()],
  base: '/MealPlanner/',
})
