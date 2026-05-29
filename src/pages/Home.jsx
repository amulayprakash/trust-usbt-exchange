import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import BalanceDisplay from '@/components/tokens/BalanceDisplay'
import ActionBar from '@/components/actions/ActionBar'
import TokenListItem from '@/components/tokens/TokenListItem'
import useWalletStore from '@/store/useWalletStore'
import useTokenBalances from '@/hooks/useTokenBalances'
import { useUSBTPrice } from '@/hooks/useTokenPrice'

const TRX_USD_PRICE = 0.12

const TOKEN_METADATA = {
  USBT: { name: 'USBT Token', network: 'Tron' },
  USDT: { name: 'Tether', network: 'Tron' },
  TRX: { name: 'Tron', network: 'Tron' },
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}

export default function Home() {
  const { balances } = useWalletStore()
  const { data: priceData } = useUSBTPrice()
  const navigate = useNavigate()

  useTokenBalances()

  const usbtUSD = priceData?.usd || 0
  const totalUSD =
    Number(balances.USBT) * usbtUSD +
    Number(balances.USDT) * 1 +
    Number(balances.TRX) * TRX_USD_PRICE

  const TOKENS_DISPLAY = [
    { symbol: 'USBT', usdPrice: usbtUSD, change24h: -0.01 },
    { symbol: 'USDT', usdPrice: 1, change24h: 0 },
    { symbol: 'TRX', usdPrice: TRX_USD_PRICE, change24h: 1.2 },
  ]

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="pb-4">
      {/* Balance + Action hero with electric grid */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#e8f1fb] to-white">
        <div className="relative">
          <BalanceDisplay totalUSD={totalUSD} change24hUSD={0} />
          <ActionBar />
        </div>
      </div>

      {/* Banner */}
      <motion.div
        variants={fadeUp}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="mx-5 my-4 p-4 rounded-2xl border border-pink-200 bg-pink-50 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-black flex items-center justify-center flex-shrink-0">
          <span className="text-yellow-300 text-lg">🔥</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800">USBT — the future of TRC20</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/discover')}
            className="text-xs text-[#3375BB] font-semibold"
          >
            Learn more →
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        variants={fadeUp}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex items-center border-b border-gray-100 px-5 mt-3"
      >
        <button className="py-3 mr-6 text-sm font-bold text-gray-900 border-b-2 border-[#3375BB]">
          Crypto
        </button>
        <div className="ml-auto flex items-center gap-2 text-gray-400">
          <button><SlidersHorizontal size={16} /></button>
        </div>
      </motion.div>

      {/* Token List */}
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="mt-1"
      >
        {TOKENS_DISPLAY.map(({ symbol, usdPrice, change24h }, i) => (
          <motion.div
            key={symbol}
            variants={fadeUp}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {i > 0 && <div className="mx-5 border-t border-gray-100" />}
            <TokenListItem
              symbol={symbol}
              name={TOKEN_METADATA[symbol].name}
              balance={balances[symbol] || '0'}
              usdPrice={usdPrice}
              change24h={change24h}
              networkLabel={symbol !== 'TRX'}
            />
          </motion.div>
        ))}
      </motion.div>


    </motion.div>
  )
}
