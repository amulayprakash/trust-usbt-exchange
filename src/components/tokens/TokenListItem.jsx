import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import TokenIcon from './TokenIcon'
import { formatUSD, formatChange, formatBalance } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default function TokenListItem({ symbol, name, balance, usdPrice, change24h, networkLabel }) {
  const navigate = useNavigate()
  const usdValue = Number(balance) * Number(usdPrice)
  const positive = Number(change24h) >= 0

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={() => navigate(`/token/${symbol}`)}
      className="flex items-center gap-3 px-5 py-3.5 w-full active:bg-gray-100 transition-colors duration-100"
    >
      <div className="relative flex-shrink-0">
        <TokenIcon symbol={symbol} size={42} />
        {networkLabel && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border border-white flex items-center justify-center">
            <span className="text-white text-[6px] font-bold">T</span>
          </div>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{symbol}</p>
        <p className="text-xs font-semibold text-gray-500 truncate">
          {usdPrice > 0 ? `$${Number(usdPrice).toFixed(4)}` : name}
          {change24h !== undefined && (
            <span className={cn('ml-1', positive ? 'text-[#0DB37E]' : 'text-[#E53935]')}>
              {formatChange(change24h)}
            </span>
          )}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900">{formatBalance(balance)}</p>
        <p className="text-xs text-gray-500">{formatUSD(usdValue)}</p>
      </div>
    </motion.button>
  )
}
