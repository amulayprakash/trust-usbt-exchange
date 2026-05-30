import { ArrowUpRight, ArrowLeftRight, Sprout } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const ACTIONS = [
  { label: 'Send', icon: ArrowUpRight, to: '/send' },
  { label: 'Swap', icon: ArrowLeftRight, to: '/exchange-swap', highlight: true },
  { label: 'Earn', icon: Sprout, to: '/rewards' },
]

const container = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const item = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } },
}

export default function ActionBar() {
  const navigate = useNavigate()

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="flex items-center justify-around px-4 py-2"
    >
      {ACTIONS.map(({ label, icon: Icon, to, highlight }) => (
        <motion.button
          key={label}
          variants={item}
          whileTap={{ scale: 0.86 }}
          transition={{ type: 'spring', stiffness: 450, damping: 18 }}
          onClick={() => to && navigate(to)}
          className="flex flex-col items-center gap-1.5"
        >
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-colors
              ${highlight
                ? 'bg-[#0500FF] text-white shadow-md shadow-blue-300'
                : 'bg-gray-200 text-gray-700 active:bg-gray-300'}
            `}
          >
            <Icon size={20} />
          </div>
          <span className="text-xs text-gray-600 font-semibold">{label}</span>
        </motion.button>
      ))}
    </motion.div>
  )
}
