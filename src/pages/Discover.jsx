import { useState } from 'react'
import { ExternalLink, Copy, Check, ArrowUpRight } from 'lucide-react'
import { CONTRACTS } from '@/config/tron'

const USBT_CONTRACT  = CONTRACTS.USBT
const USDT_CONTRACT  = CONTRACTS.USDT
const SUNSWAP_POOL   = CONTRACTS.SUNSWAP_POOL

const LINKS = [
  {
    category: 'Explorer',
    items: [
      {
        name: 'TronScan — USBT Token',
        desc: 'View contract, holders & transactions',
        url: `https://tronscan.org/#/token20/${USBT_CONTRACT}`,
        iconBg: 'from-red-500 to-rose-500',
        icon: '🔍',
      },
      {
        name: 'TronScan — USBT/USDT Pool',
        desc: 'SunSwap liquidity pool on-chain',
        url: `https://tronscan.org/#/contract/${SUNSWAP_POOL}`,
        iconBg: 'from-orange-400 to-amber-500',
        icon: '🏦',
      },
    ],
  },
  {
    category: 'Trading',
    items: [
      {
        name: 'SunSwap — USBT/USDT Pool',
        desc: 'View pool details, liquidity & trades',
        url: `https://sun.io/?lang=en-US#/scan/pairDetail?pairAddress=${SUNSWAP_POOL}&version=v2`,
        iconBg: 'from-orange-500 to-yellow-400',
        icon: '☀️',
      },
    ],
  },
  {
    category: 'Analytics',
    items: [
      {
        name: 'GeckoTerminal — USBT Pool',
        desc: 'Real-time price, volume & liquidity depth',
        url: `https://www.geckoterminal.com/tron/pools/${SUNSWAP_POOL}`,
        iconBg: 'from-green-500 to-emerald-400',
        icon: '🦎',
      },
      {
        name: 'CoinGecko — USBT',
        desc: 'Market data, price history & info',
        url: 'https://www.coingecko.com/en/coins/usbt-token',
        iconBg: 'from-green-400 to-teal-400',
        icon: '🪙',
      },
      {
        name: 'DexScreener — USBT/USDT',
        desc: 'Live chart and trade activity',
        url: `https://dexscreener.com/tron/${SUNSWAP_POOL}`,
        iconBg: 'from-blue-500 to-violet-500',
        icon: '📈',
      },
    ],
  },
  {
    category: 'Community',
    items: [
      {
        name: 'USBT Website',
        desc: 'Official project site & docs',
        url: 'https://usbt.online',
        iconBg: 'from-[#0500FF] to-[#0400CC]',
        icon: '🌐',
      },
    ],
  },
]

const CONTRACT_ITEMS = [
  { label: 'USBT Contract', value: USBT_CONTRACT, url: `https://tronscan.org/#/token20/${USBT_CONTRACT}` },
  { label: 'USDT Contract', value: USDT_CONTRACT, url: `https://tronscan.org/#/token20/${USDT_CONTRACT}` },
  { label: 'SunSwap Pool',  value: SUNSWAP_POOL,  url: `https://tronscan.org/#/contract/${SUNSWAP_POOL}` },
]

function CopyableAddress({ label, value, url }) {
  const [copied, setCopied] = useState(false)

  const copy = async (e) => {
    e.preventDefault()
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-600 mb-0.5">{label}</p>
        <p className="text-xs font-mono font-semibold text-gray-800 truncate">{value.slice(0, 16)}…{value.slice(-6)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={copy}
          className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
        >
          {copied
            ? <Check size={13} className="text-[#0DB37E]" />
            : <Copy size={13} className="text-gray-500" />
          }
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
        >
          <ArrowUpRight size={13} className="text-gray-500" />
        </a>
      </div>
    </div>
  )
}

export default function Discover() {
  return (
    <div className="pb-6">

      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <img src="/tokens/usbt.png" alt="USBT" className="w-9 h-9 rounded-full" />
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-none">USBT Token</h2>
            <p className="text-xs text-gray-400 mt-0.5">TRC-20 · Tron Network</p>
          </div>
        </div>
      </div>

      {/* Contract addresses */}
      <div className="mx-5 mb-5 p-4 bg-gray-200 rounded-2xl border border-gray-300">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contract Addresses</p>
        {CONTRACT_ITEMS.map(item => (
          <CopyableAddress key={item.label} {...item} />
        ))}
      </div>

      {/* Link sections */}
      {LINKS.map(({ category, items }) => (
        <div key={category} className="mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-5 mb-2">{category}</p>
          <div className="space-y-2 px-5">
            {items.map(({ name, desc, url, iconBg, icon }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 bg-gray-200 rounded-2xl border border-gray-300 hover:border-[#0500FF]/50 hover:bg-blue-100/60 transition-colors group active:scale-[0.98]"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center flex-shrink-0 text-lg`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{desc}</p>
                </div>
                <ExternalLink size={14} className="text-gray-300 group-hover:text-[#0500FF] transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
