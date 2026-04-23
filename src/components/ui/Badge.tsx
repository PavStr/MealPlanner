type Color = 'green' | 'yellow' | 'blue' | 'gray' | 'red'

interface BadgeProps {
  children: React.ReactNode
  color?: Color
}

const colorClasses: Record<Color, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
  red: 'bg-red-100 text-red-800',
}

export default function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>
      {children}
    </span>
  )
}
