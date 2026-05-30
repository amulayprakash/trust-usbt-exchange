import { NavLink } from 'react-router-dom'
import { Home, TrendingUp, ArrowLeftRight, Gift, Compass } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/trending', icon: TrendingUp, label: 'Trending' },
  { to: '/exchange-swap', icon: ArrowLeftRight, label: 'Trade', center: true },
  { to: '/rewards', icon: Gift, label: 'Rewards' },
  { to: '/discover', icon: Compass, label: 'Discover' },
]

export default function BottomNav() {
  return (
    <div className="bg-white border-t border-gray-100 pb-safe">
      <div className="flex items-center justify-around px-2 h-16">
        {TABS.map(({ to, icon: Icon, label, exact, center }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className="flex flex-col items-center justify-center flex-1 relative"
          >
            {({ isActive }) =>
              center ? (
                <motion.div
                  whileTap={{ scale: 0.86 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="-mt-5"
                >
                  <div className="w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg shadow-blue-500/30 mb-1 bg-[#0500FF]">
                    <motion.div
                      animate={{ rotate: isActive ? 90 : 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                    >
                      <Icon size={22} className="text-white" />
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.82 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className="flex flex-col items-center gap-0.5 py-1 relative px-3"
                >
                  <motion.div
                    animate={{ y: isActive ? -1 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  >
                    <Icon
                      size={22}
                      className={isActive ? 'text-[#0500FF]' : 'text-gray-400'}
                    />
                  </motion.div>
                  <span
                    className={cn(
                      'text-[10px] font-semibold transition-colors duration-150',
                      isActive ? 'text-[#0500FF]' : 'text-gray-400'
                    )}
                  >
                    {label}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute -bottom-1 w-5 h-[3px] rounded-full bg-[#0500FF]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.div>
              )
            }
          </NavLink>
        ))}
      </div>
    </div>
  )
}
