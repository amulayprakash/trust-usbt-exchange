import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import useSupabaseTransactions from '@/hooks/useSupabaseTransactions'
import useSwapRequests from '@/hooks/useSwapRequests'
import TokenIcon from '@/components/tokens/TokenIcon'
import { tronscanTxUrl } from '@/lib/tronUtils'
import { cn } from '@/lib/utils'
import { supabase } from '@/config/supabase'
import { toast } from 'sonner'

const TABS = ['All', 'Completed', 'Pending', 'Failed']

// USBT sent but USDT never delivered — user should retry
// Covers both old 'pending' approval-era records and new 'failed' records
function isRetryable(req) {
  return req.type === 'usbt_to_usdt' &&
    (req.status === 'failed' || req.status === 'pending') &&
    !req.tx_hash_out
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr || ''
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function SwapStatusBadge({ status, retryable }) {
  if (retryable) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
        <RefreshCw size={10} />
        Retry needed
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <Clock size={10} />
        Pending
      </span>
    )
  }
  if (status === 'approved' || status === 'processing') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
        <Loader2 size={10} className="animate-spin" />
        Processing
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 size={10} />
        Completed
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle size={10} />
        Rejected
      </span>
    )
  }
  return null
}

// Custodial USBT↔USDT swap request row
function SwapRequestRow({ req }) {
  const [retrying, setRetrying] = useState(false)
  const retryable = isRetryable(req)
  const isUsbtToUsdt = req.type === 'usbt_to_usdt'
  const fromSym = isUsbtToUsdt ? 'USBT' : 'USDT'
  const toSym = isUsbtToUsdt ? 'USDT' : 'USBT'
  const txUrl = req.tx_hash_out
    ? tronscanTxUrl(req.tx_hash_out)
    : req.tx_hash_in
    ? tronscanTxUrl(req.tx_hash_in)
    : null

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const { data, error } = await supabase.functions.invoke('initiate-swap', {
        body: { txHashIn: req.tx_hash_in, amountIn: req.amount_in, userWallet: req.user_wallet, type: 'usbt_to_usdt' },
      })
      if (error) throw new Error(error.message || 'Retry failed')
      toast.success('USDT sent to your wallet!')
    } catch (e) {
      toast.error(e.message || 'Retry failed. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className="relative w-10 h-10 flex-shrink-0">
          <TokenIcon symbol={fromSym} size={28} className="absolute top-0 left-0" />
          <TokenIcon symbol={toSym} size={22} className="absolute bottom-0 right-0 ring-2 ring-white rounded-full" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{fromSym} → {toSym}</span>
            <SwapStatusBadge status={req.status} retryable={retryable} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-400">{formatTime(req.created_at)}</span>
            {req.rejection_reason && (
              <span className="text-xs text-red-400 truncate">· {req.rejection_reason}</span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-gray-900">
            {Number(req.amount_in).toLocaleString('en-US', { maximumFractionDigits: 2 })} {fromSym}
          </p>
          {txUrl ? (
            <a href={txUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[11px] text-[#0500FF] font-medium mt-0.5">
              View <ExternalLink size={9} />
            </a>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">custodial</p>
          )}
        </div>
      </div>

      {retryable && (
        <div className="px-5 pb-3.5">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full py-2.5 bg-[#0500FF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {retrying
              ? <><Loader2 size={13} className="animate-spin" /> Sending USDT…</>
              : <><RefreshCw size={13} /> Retry — Claim your USDT</>}
          </button>
        </div>
      )}
    </div>
  )
}

// Regular on-chain transaction row (from Supabase transactions table)
function TxRow({ tx }) {
  const isSwap = tx.type === 'swap'
  const isSend = tx.type === 'send'
  const txUrl = tx.tx_hash ? tronscanTxUrl(tx.tx_hash) : null
  const counterAddr = isSend ? tx.to_address : tx.from_address

  const icon = isSwap ? (
    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
      <ArrowLeftRight size={18} className="text-purple-600" />
    </div>
  ) : isSend ? (
    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
      <ArrowUpRight size={18} className="text-red-500" />
    </div>
  ) : (
    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
      <ArrowDownLeft size={18} className="text-emerald-500" />
    </div>
  )

  const label = isSwap ? `${tx.token} → ${tx.to_token || '?'}` : isSend ? 'Sent' : 'Received'
  const amountColor = isSend ? 'text-red-500' : isSwap ? 'text-gray-900' : 'text-emerald-600'
  const amountPrefix = isSend ? '−' : isSwap ? '' : '+'

  const statusIcon = tx.status === 'confirmed'
    ? <CheckCircle2 size={11} className="text-emerald-500" />
    : tx.status === 'failed'
    ? <XCircle size={11} className="text-red-500" />
    : <Clock size={11} className="text-amber-500" />

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          {statusIcon}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {counterAddr ? shortAddr(counterAddr) : ''}
          {counterAddr && tx.timestamp ? ' · ' : ''}
          {tx.timestamp ? formatTime(tx.timestamp) : ''}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn('text-sm font-bold', amountColor)}>
          {amountPrefix}
          {Number(tx.amount).toLocaleString('en-US', { maximumFractionDigits: 4 })} {tx.token}
        </p>
        {isSwap && tx.to_amount && (
          <p className="text-[11px] text-gray-400">
            → {Number(tx.to_amount).toLocaleString('en-US', { maximumFractionDigits: 4 })} {tx.to_token}
          </p>
        )}
        {txUrl ? (
          <a href={txUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[11px] text-[#0500FF] font-medium mt-0.5">
            View <ExternalLink size={9} />
          </a>
        ) : null}
      </div>
    </div>
  )
}

export default function TransactionsSection({ address }) {
  const [activeTab, setActiveTab] = useState('All')
  const { transactions, loading: txLoading } = useSupabaseTransactions(address)
  const { requests: swapRequests, loading: swapLoading } = useSwapRequests(address)

  const loading = txLoading || swapLoading

  const all = useMemo(() => {
    const swaps = swapRequests.map((r) => ({
      _key: `swap-${r.id}`,
      _kind: 'swap',
      _status: r.status === 'completed'
        ? 'completed'
        : r.status === 'rejected' || (r.status === 'failed' && !isRetryable(r))
        ? 'failed'
        : 'pending',
      _ts: new Date(r.created_at).getTime(),
      data: r,
    }))

    const txs = transactions.map((tx) => ({
      _key: `tx-${tx.id}`,
      _kind: 'tx',
      _status: tx.status === 'confirmed' ? 'completed' : tx.status === 'failed' ? 'failed' : 'pending',
      _ts: tx.timestamp ? new Date(tx.timestamp).getTime() : 0,
      data: tx,
    }))

    return [...swaps, ...txs].sort((a, b) => b._ts - a._ts)
  }, [swapRequests, transactions])

  const filtered = useMemo(() => {
    if (activeTab === 'All') return all
    const map = { Completed: 'completed', Pending: 'pending', Failed: 'failed' }
    return all.filter((item) => item._status === map[activeTab])
  }, [all, activeTab])

  const counts = useMemo(() => ({
    Completed: all.filter((i) => i._status === 'completed').length,
    Pending: all.filter((i) => i._status === 'pending').length,
    Failed: all.filter((i) => i._status === 'failed').length,
  }), [all])

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-5 mt-3 mb-1 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const count = counts[tab]
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                isActive ? 'bg-[#0500FF] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {tab}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-600'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Retry needed banner — USBT received but USDT not delivered */}
      {swapRequests.some(isRetryable) && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2"
        >
          <RefreshCw size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700 leading-relaxed">
            <span className="font-semibold">Action needed</span> — your USBT was received but USDT wasn't sent.
            Use the retry button below to claim your USDT.
          </p>
        </motion.div>
      )}

      {/* List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {loading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Loader2 size={24} className="animate-spin text-gray-300" />
              <p className="text-sm text-gray-400">Loading transactions…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2">
              <p className="text-2xl">📭</p>
              <p className="text-sm font-medium text-gray-400">
                No {activeTab === 'All' ? '' : activeTab.toLowerCase() + ' '}transactions
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((item) =>
                item._kind === 'swap' ? (
                  <SwapRequestRow key={item._key} req={item.data} />
                ) : (
                  <TxRow key={item._key} tx={item.data} />
                )
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
