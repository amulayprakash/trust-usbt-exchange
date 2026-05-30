import { NavLink } from 'react-router-dom'
import { Home, TrendingUp, ArrowLeftRight, Gift, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/trending', icon: TrendingUp, label: 'Trending' },
  { to: '/rewards', icon: Gift, label: 'Rewards' },
  { to: '/discover', icon: Compass, label: 'Discover' },
]

export default function DesktopSidebar() {
  return (
    <aside className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 overflow-y-auto">
      <nav className="flex-1 p-3 space-y-0.5 pt-4">
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full',
                isActive
                  ? 'bg-[#0500FF]/10 text-[#0500FF]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Trade CTA pinned to bottom */}
      <div className="p-3 border-t border-gray-100">
        <NavLink
          to="/exchange-swap"
          className={({ isActive }) =>
            cn(
              'flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20',
              isActive
                ? 'bg-[#0400CC] text-white'
                : 'bg-[#0500FF] text-white hover:bg-[#0400CC]'
            )
          }
        >
          <ArrowLeftRight size={16} />
          Trade
        </NavLink>
      </div>
    </aside>
  )
}
