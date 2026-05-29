import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, ArrowLeftRight, Copy, Check, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import PriceChart from '@/components/charts/PriceChart'
import TimeframeSelector from '@/components/charts/TimeframeSelector'
import TokenIcon from '@/components/tokens/TokenIcon'
import { useUSBTPrice, useUSBTChart } from '@/hooks/useTokenPrice'
import useWalletStore from '@/store/useWalletStore'
import { formatUSD, formatBalance } from '@/lib/formatters'
import { CONTRACTS } from '@/config/tron'

const TOKEN_META = {
  USBT: {
    name: 'USBT Token',
    network: 'TRC-20 · Tron',
    contract: CONTRACTS.USBT,
    pool: CONTRACTS.SUNSWAP_POOL,
    tronscanUrl: `https://tronscan.org/#/token20/${CONTRACTS.USBT}`,
    poolUrl: `https://sun.io/?lang=en-US#/scan/pairDetail?pairAddress=${CONTRACTS.SUNSWAP_POOL}&version=v2`,
    geckoUrl: 'https://www.coingecko.com/en/coins/usbt-token',
    desc: 'USBT is a 1:1 USDT-backed TRC-20 stablecoin on the Tron network. Fully collateralised, on-chain verifiable, and instantly redeemable.',
  },
  USDT: {
    name: 'Tether',
    network: 'TRC-20 · Tron',
    contract: CONTRACTS.USDT,
    tronscanUrl: `https://tronscan.org/#/token20/${CONTRACTS.USDT}`,
    geckoUrl: 'https://www.coingecko.com/en/coins/tether',
    desc: 'Tether (USDT) is the world\'s most liquid stablecoin, pegged 1:1 to the US dollar.',
  },
  TRX: {
    name: 'Tron',
    network: 'Native · Tron',
    tronscanUrl: 'https://tronscan.org/#/token/trx',
    geckoUrl: 'https://www.coingecko.com/en/coins/tron',
    desc: 'TRX is the native token of the Tron blockchain, used to pay for energy and bandwidth on the network.',
  },
}

function CopyableRow({ label, value, url }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
        <p className="text-xs font-mono font-semibold text-gray-700 truncate">
          {value.slice(0, 14)}…{value.slice(-6)}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={copy} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center">
          {copied ? <Check size={12} className="text-[#0DB37E]" /> : <Copy size={12} className="text-gray-500" />}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center">
          <ExternalLink size={12} className="text-gray-500" />
        </a>
      </div>
    </div>
  )
}

export default function TokenDetail() {
  const { symbol = 'USBT' } = useParams()
  const navigate = useNavigate()
  const [timeframe, setTimeframe] = useState('1D')

  const { data: priceData, isLoading: priceLoading } = useUSBTPrice()
  const { data: chartData = [] } = useUSBTChart(timeframe)
  const { balances } = useWalletStore()

  const meta = TOKEN_META[symbol] || TOKEN_META.USBT
  const usdPrice = priceData?.usd || 0
  const balance = balances[symbol] || '0'
  const usdValue = Number(balance) * usdPrice

  // Derive 24h change from chart data
  const change24h = chartData.length >= 2
    ? ((chartData[chartData.length - 1]?.value - chartData[0]?.value) / (chartData[0]?.value || 1)) * 100
    : 0
  const positive = change24h >= 0

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <TokenIcon symbol={symbol} size={24} />
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900 leading-none">{meta.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{meta.network}</p>
          </div>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Price hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="px-5 pt-5 pb-3"
        >
          <p className="text-[11px] text-gray-400 mb-1 uppercase tracking-wider font-medium">Current Price</p>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold text-gray-900 tracking-tight">
              {priceLoading ? '…' : usdPrice > 0 ? `$${usdPrice.toFixed(6)}` : '—'}
            </p>
            {!priceLoading && chartData.length >= 2 && (
              <span
                className="text-sm font-semibold mb-1.5 px-2 py-0.5 rounded-full"
                style={{
                  background: positive ? 'rgba(13,179,126,0.1)' : 'rgba(229,57,53,0.1)',
                  color: positive ? '#0DB37E' : '#E53935',
                }}
              >
                {positive ? '▲' : '▼'} {Math.abs(change24h).toFixed(2)}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">24h change · Live via CoinGecko</p>
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

        {/* User balance card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.35 }}
          className="mx-4 mt-4 p-4 rounded-2xl border border-gray-300 bg-gray-200"
        >
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-bold">Your Balance</p>
          <div className="flex items-center gap-3">
            <TokenIcon symbol={symbol} size={44} />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900 leading-none">
                {formatBalance(balance)} <span className="text-base font-semibold text-gray-500">{symbol}</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">{formatUSD(usdValue)}</p>
            </div>
          </div>
        </motion.div>

        {/* Coin details */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.35 }}
          className="mx-4 mt-3 p-4 rounded-2xl border border-gray-300 bg-gray-200 space-y-4"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">About</p>

          <p className="text-sm text-gray-600 leading-relaxed">{meta.desc}</p>

          <div className="border-t border-gray-200 pt-3 space-y-3">
            {/* Network */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">Network</p>
              <p className="text-xs font-bold text-gray-800">{meta.network}</p>
            </div>

            {/* Contract */}
            {meta.contract && (
              <CopyableRow
                label="Contract"
                value={meta.contract}
                url={meta.tronscanUrl}
              />
            )}

            {/* Pool */}
            {meta.pool && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">SunSwap Pool</p>
                <a
                  href={meta.poolUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-[#3375BB]"
                >
                  View pool <ExternalLink size={11} />
                </a>
              </div>
            )}

            {/* CoinGecko */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Market data</p>
              <a
                href={meta.geckoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-[#3375BB]"
              >
                CoinGecko <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="mx-4 mt-3 mb-6 flex gap-3"
        >
          <button
            onClick={() => navigate('/send')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 bg-white font-semibold text-sm text-gray-700 hover:border-[#3375BB] hover:text-[#3375BB] transition-colors active:scale-[0.98]"
          >
            <ArrowUpRight size={17} />
            Send
          </button>
          {symbol === 'USBT' && (
            <button
              onClick={() => navigate('/swap')}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#3375BB] font-semibold text-sm text-white hover:bg-[#2560a0] transition-colors active:scale-[0.98]"
            >
              <ArrowLeftRight size={17} />
              Swap
            </button>
          )}
        </motion.div>

      </div>
    </div>
  )
}
