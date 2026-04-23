import { NavLink } from 'react-router-dom'

const nav = [
  { to: '/recipes', label: 'Recipe Library' },
  { to: '/plan', label: 'Plan Builder' },
  { to: '/summary', label: 'Plan Summary' },
  { to: '/import', label: 'Import Recipes' },
]

export default function Sidebar() {
  return (
    <aside className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-200">
        <h1 className="text-base font-bold text-gray-900 leading-tight">Meal Planner</h1>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
