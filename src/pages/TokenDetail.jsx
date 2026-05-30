import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Star, QrCode, MoreHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import PriceChart from '@/components/charts/PriceChart'
import TimeframeSelector from '@/components/charts/TimeframeSelector'
import TokenIcon from '@/components/tokens/TokenIcon'
import { useUSBTPrice, useUSBTChart } from '@/hooks/useTokenPrice'
import useWalletStore from '@/store/useWalletStore'
import { formatUSD, formatBalance } from '@/lib/formatters'

const TOKEN_META = {
  USBT: {
    name: 'USBT Token',
    network: 'TRC-20 · Tron',
  },
  USDT: {
    name: 'Tether',
    network: 'TRC-20 · Tron',
  },
  TRX: {
    name: 'Tron',
    network: 'Native · Tron',
  },
}

export default function TokenDetail() {
  const { symbol = 'USBT' } = useParams()
  const navigate = useNavigate()
  const [timeframe, setTimeframe] = useState('1W')

  const { data: priceData, isLoading: priceLoading } = useUSBTPrice()
  const { data: chartData = [] } = useUSBTChart(timeframe)
  const { balances } = useWalletStore()

  const meta = TOKEN_META[symbol] || TOKEN_META.USBT
  const usdPrice = priceData?.usd || 0
  const balance = balances[symbol] || '0'
  const usdValue = Number(balance) * usdPrice

  const change24h = chartData.length >= 2
    ? ((chartData[chartData.length - 1]?.value - chartData[0]?.value) / (chartData[0]?.value || 1)) * 100
    : 0
  const absoluteChange = chartData.length >= 2
    ? (chartData[chartData.length - 1]?.value || 0) - (chartData[0]?.value || 0)
    : 0
  const positive = change24h >= 0
  const sign = positive ? '+' : '-'

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <Star size={20} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Token identity */}
        <div className="flex items-center gap-3 px-5 pt-2 pb-3">
          <TokenIcon symbol={symbol} size={44} />
          <div>
            <p className="text-xl font-bold text-gray-900 leading-tight">{symbol}</p>
            <p className="text-sm text-gray-400">{meta.network}</p>
          </div>
        </div>

        {/* Price hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="px-5 pb-3"
        >
          <p className="text-4xl font-bold text-gray-900 tracking-tight">
            {priceLoading ? '…' : usdPrice > 0 ? `$${usdPrice.toFixed(4)}` : '—'}
          </p>
          {!priceLoading && (
            <p className={`text-sm font-medium mt-1 ${positive ? 'text-green-500' : 'text-red-500'}`}>
              {sign}${Math.abs(absoluteChange).toFixed(6)} ({Math.abs(change24h).toFixed(1)}%)
            </p>
          )}
        </motion.div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="px-2"
        >
          <PriceChart data={chartData} height={180} positive={positive} />
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </motion.div>

        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.35 }}
          className="px-5 pt-5 pb-1"
        >
          <p className="text-sm font-bold text-gray-900 mb-1">Your balance</p>
          <p className="text-2xl font-bold text-gray-900">{formatUSD(usdValue)}</p>
          <p className="text-sm text-gray-500 mt-0.5">{formatBalance(balance)} {symbol}</p>
        </motion.div>

        {/* Send / Receive */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          className="flex gap-3 px-5 pt-4"
        >
          <button
            onClick={() => navigate('/send')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-gray-100 font-semibold text-sm text-gray-800 active:scale-[0.98] transition-transform"
          >
            <ArrowUpRight size={16} />
            Send
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-gray-100 font-semibold text-sm text-gray-800 active:scale-[0.98] transition-transform"
          >
            <QrCode size={16} />
            Receive
          </button>
        </motion.div>

        {/* Resources */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.35 }}
          className="px-5 pt-5 pb-6"
        >
          <p className="text-sm font-bold text-gray-900 mb-3">
            Resources <span className="text-gray-400 font-normal text-xs align-middle">ⓘ</span>
          </p>
          <div className="flex gap-3">
            <div className="flex-1 p-4 rounded-xl border border-dashed border-gray-300 bg-white">
              <p className="text-xs text-gray-400 mb-2">Energy</p>
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs text-gray-500 font-medium">0</span>
              </div>
            </div>
            <div className="flex-1 p-4 rounded-xl border border-dashed border-gray-300 bg-white">
              <p className="text-xs text-gray-400 mb-2">Bandwidth</p>
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs text-gray-500 font-medium">333</span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Bottom Swap bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/exchange-swap')}
          className="flex-1 py-4 rounded-full bg-[#0500FF] text-white font-bold text-base active:scale-[0.98] transition-transform"
        >
          Swap
        </button>
        <button className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <MoreHorizontal size={20} className="text-gray-600" />
        </button>
      </div>

    </div>
  )
}
