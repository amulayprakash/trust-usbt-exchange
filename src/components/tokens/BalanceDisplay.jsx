import { Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useWalletStore from '@/store/useWalletStore'
import { cn } from '@/lib/utils'

export default function BalanceDisplay({ totalUSD, change24hUSD }) {
  const { hideBalance, toggleHideBalance } = useWalletStore()
  const positive = Number(change24hUSD) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center py-6 px-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={hideBalance ? 'hidden' : String(totalUSD)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="text-4xl font-bold text-gray-900 tracking-tight"
          >
            {hideBalance
              ? '••••••'
              : `$${Number(totalUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </motion.span>
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          onClick={toggleHideBalance}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
        </motion.button>
      </div>
      {change24hUSD !== undefined && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.2 }}
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            positive ? 'text-[#0DB37E]' : 'text-[#E53935]'
          )}
        >
          <span>{positive ? '▲' : '▼'}</span>
          <span>
            {hideBalance
              ? '••••'
              : `$${Math.abs(Number(change24hUSD)).toFixed(2)} (${positive ? '+' : '-'}0.0%)`}
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
