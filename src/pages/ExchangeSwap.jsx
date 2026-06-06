import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpDown, Loader2, CheckCircle2, Gift } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/config/supabase'
import TokenIcon from '@/components/tokens/TokenIcon'
import useWalletStore from '@/store/useWalletStore'
import { sendToken, ensureUnlimitedApproval } from '@/hooks/useSunSwap'
import { formatBalance } from '@/lib/formatters'
import { tronscanTxUrl } from '@/lib/tronUtils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { listenSwapRequest } from '@/lib/supabaseDb'

const OFFER_TIERS = [
  { min: 200_000, bonus: 0.20, label: '200K+', tag: '20% bonus' },
  { min: 100_000, bonus: 0.15, label: '100K+', tag: '15% bonus' },
  { min: 50_000,  bonus: 0.10, label: '50K+',  tag: '10% bonus' },
]

function getBonusRate(amount) {
  const n = Number(amount)
  for (const tier of OFFER_TIERS) {
    if (n >= tier.min) return tier.bonus
  }
  return 0
}

const EXCHANGE_ADDRESS = import.meta.env.VITE_EXCHANGE_WALLET_ADDRESS

function getAmountFontSize(val) {
  const len = String(val || '').length
  if (len > 12) return 'text-base'
  if (len > 8)  return 'text-xl'
  return 'text-3xl'
}

export default function ExchangeSwap() {
  const navigate = useNavigate()
  const { address, balances } = useWalletStore()

  // 'usdt_to_usbt' | 'usbt_to_usdt'
  const [direction, setDirection] = useState('usbt_to_usdt')
  const [amount, setAmount] = useState('')
  const [rotated, setRotated] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Step tracking: idle → sending → processing → done
  const [step, setStep] = useState('idle')
  const [requestId, setRequestId] = useState(null)
  const [requestStatus, setRequestStatus] = useState(null)
  const [txHashOut, setTxHashOut] = useState(null)

  const fromToken = direction === 'usdt_to_usbt' ? 'USDT' : 'USBT'
  const toToken = direction === 'usdt_to_usbt' ? 'USBT' : 'USDT'
  const balance = balances[fromToken] || '0'
  const amountValid = Number(amount) > 0 && Number(amount) <= Number(balance)

  const bonusRate = direction === 'usdt_to_usbt' ? getBonusRate(amount) : 0
  const bonusAmount = Number(amount) * bonusRate
  const receiveAmount = Number(amount) + bonusAmount

  // Live-poll the swap request status after it's created
  useEffect(() => {
    if (!requestId) return
    const unsub = listenSwapRequest(requestId, (doc) => {
      if (!doc) return
      setRequestStatus(doc.status)
      if (doc.tx_hash_out) setTxHashOut(doc.tx_hash_out)
      if (doc.status === 'completed') setStep('done')
      if (doc.status === 'rejected') setStep('rejected')
    })
    return unsub
  }, [requestId])

  const handleFlip = () => {
    setRotated((r) => !r)
    setDirection((d) => (d === 'usdt_to_usbt' ? 'usbt_to_usdt' : 'usdt_to_usbt'))
    setAmount('')
  }

  const handleSwap = async () => {
    if (!amountValid) return
    setShowConfirm(false)
    setStep('sending')

    try {
      // Step 1: Approve USDT spending only when swapping USDT → USBT
      if (direction === 'usdt_to_usbt') {
        await ensureUnlimitedApproval('USDT', EXCHANGE_ADDRESS, address)
      }

      // Step 2: User sends their token to the exchange wallet
      const txHashIn = await sendToken(fromToken, EXCHANGE_ADDRESS, amount, address)
      if (!txHashIn) throw new Error('Transaction was declined or failed to broadcast')
      toast.success('Transfer confirmed, processing swap...')

      setStep('processing')

      if (direction === 'usdt_to_usbt') {
        // Step 2a: Call Edge Function to verify and send USBT back
        const { data, error } = await supabase.functions.invoke('initiate-swap', {
          body: { txHashIn, amountIn: amount, userWallet: address },
        })
        if (error) throw new Error(error.message || 'Swap failed')
        const { requestId: id, txHashOut: outHash } = data
        setRequestId(id)
        if (outHash) {
          setTxHashOut(outHash)
          setStep('done')
        }
      } else {
        // Step 2b: USBT → USDT — verify and send USDT instantly
        const { data, error } = await supabase.functions.invoke('initiate-swap', {
          body: { txHashIn, amountIn: amount, userWallet: address, type: 'usbt_to_usdt' },
        })
        if (error) throw new Error(error.message || 'Swap failed')
        const { requestId: id, txHashOut: outHash } = data
        setRequestId(id)
        if (outHash) {
          setTxHashOut(outHash)
          setStep('done')
        }
      }
    } catch (e) {
      toast.error(e.message || 'Swap failed')
      setStep('idle')
    }
  }

  // ── Completed screen ──
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 gap-5">
        <div className="w-20 h-20 rounded-full bg-[#0DB37E]/10 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-[#0DB37E]" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Swap Completed!</h2>
          <p className="text-sm text-gray-500">
            {amount} {fromToken} → {receiveAmount.toFixed(6)} {toToken}
          </p>
          {bonusRate > 0 && (
            <p className="text-sm font-semibold text-[#0DB37E] mt-1">
              +{bonusAmount.toFixed(6)} USBT bonus included!
            </p>
          )}
        </div>
        {txHashOut && (
          <a
            href={tronscanTxUrl(txHashOut)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#0500FF] font-semibold"
          >
            View on Tronscan ↗
          </a>
        )}
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 bg-[#0500FF] text-white rounded-2xl font-bold text-base"
        >
          Done
        </button>
      </div>
    )
  }

  // ── Processing screen ──
  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 gap-5">
        <Loader2 size={48} className="animate-spin text-[#0500FF]" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Processing Swap</h2>
          <p className="text-sm text-gray-500">Sending {toToken} to your wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-base font-bold text-gray-900 border-b-2 border-[#0500FF] pb-0.5">
          Exchange Swap
        </span>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-4 pt-2 overflow-y-auto">
        {/* From */}
        <div className="bg-gray-200 rounded-2xl p-4 mb-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-600">From</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span>Balance: {formatBalance(balance)}</span>
              {['50%', 'Max'].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    const mult = pct === 'Max' ? 1 : 0.5
                    setAmount((Number(balance) * mult).toFixed(6))
                  }}
                  className="px-2 py-0.5 bg-[#0500FF] text-white rounded-full text-[10px] font-semibold"
                >
                  {pct}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-300 flex-shrink-0">
              <TokenIcon symbol={fromToken} size={28} />
              <span className="font-bold text-gray-900 text-base">{fromToken}</span>
            </div>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(
                'flex-1 min-w-0 text-right font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-400 transition-[font-size] duration-150',
                getAmountFontSize(amount)
              )}
            />
          </div>
        </div>

        {/* Flip arrow */}
        <div className="flex justify-center -my-3 z-10 relative">
          <motion.button
            animate={{ rotate: rotated ? 180 : 0 }}
            onClick={handleFlip}
            className="w-10 h-10 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center shadow-sm hover:border-[#0500FF] transition-colors"
          >
            <ArrowUpDown size={18} className="text-gray-600" />
          </motion.button>
        </div>

        {/* To */}
        <div className="bg-gray-200 rounded-2xl p-4 mt-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-600">To (you receive)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-300 flex-shrink-0">
              <TokenIcon symbol={toToken} size={28} />
              <span className="font-bold text-gray-900 text-base">{toToken}</span>
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-end">
              <span className={cn(
                'font-bold text-gray-900 transition-[font-size] duration-150',
                getAmountFontSize(amount && Number(amount) > 0 ? receiveAmount.toFixed(6) : '0')
              )}>
                {amount && Number(amount) > 0 ? receiveAmount.toFixed(6) : '0'}
              </span>
              {bonusRate > 0 && Number(amount) > 0 && (
                <span className="text-xs font-semibold text-[#0DB37E] mt-0.5">
                  +{bonusAmount.toFixed(6)} bonus
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rate info */}
        <div className="mt-3 p-3 bg-blue-50 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Rate</span>
            <span className="text-gray-700 font-semibold">1 {fromToken} = 1 {toToken}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Network fee</span>
            <span className="text-gray-700 font-semibold">≈ 1–5 TRX</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Processing</span>
            <span className="text-[#0DB37E] font-semibold">Instant</span>
          </div>
          {bonusRate > 0 && Number(amount) > 0 && (
            <div className="flex items-center justify-between text-sm pt-1 border-t border-blue-100">
              <span className="text-[#0DB37E] font-semibold">Bonus applied</span>
              <span className="text-[#0DB37E] font-bold">+{(bonusRate * 100).toFixed(0)}% extra USBT</span>
            </div>
          )}
        </div>

        {/* Offers */}
        {direction === 'usdt_to_usbt' && (
          <div className="mt-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={14} className="text-[#0500FF]" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Buy More, Get More</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {OFFER_TIERS.slice().reverse().map((tier) => {
                const active = Number(amount) >= tier.min
                return (
                  <div
                    key={tier.min}
                    className={cn(
                      'rounded-xl p-3 text-center border transition-all',
                      active
                        ? 'bg-[#0DB37E]/10 border-[#0DB37E] shadow-sm'
                        : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <span className={cn(
                      'text-lg font-extrabold block',
                      active ? 'text-[#0DB37E]' : 'text-gray-700'
                    )}>
                      {(tier.bonus * 100).toFixed(0)}%
                    </span>
                    <span className={cn(
                      'text-[10px] font-semibold block mt-0.5',
                      active ? 'text-[#0DB37E]' : 'text-gray-500'
                    )}>
                      extra USBT
                    </span>
                    <span className={cn(
                      'text-[10px] mt-1 block',
                      active ? 'text-[#0DB37E]/80' : 'text-gray-400'
                    )}>
                      Buy {tier.label} USDT
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Swap button */}
      <div className="px-4 pb-4 pt-3">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!amountValid || step === 'sending'}
          className={cn(
            'w-full py-4 rounded-2xl font-bold text-lg transition-all',
            amountValid && step === 'idle'
              ? 'bg-[#0500FF] text-white hover:bg-[#0400CC] active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          {step === 'sending'
            ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" />Sending...</span>
            : !amount ? 'Enter amount'
            : !amountValid ? 'Insufficient balance'
            : direction === 'usdt_to_usbt' ? 'Swap USDT → USBT'
            : 'Swap USBT → USDT'}
        </button>
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-5 text-center">Confirm Swap</h2>
              <div className="space-y-3 mb-5">
                <Row label="You send" value={`${amount} ${fromToken}`} />
                <Row label="You receive" value={`${receiveAmount.toFixed(6)} ${toToken}`} />
                {bonusRate > 0 && (
                  <Row label="Bonus included" value={`+${bonusAmount.toFixed(6)} USBT (${(bonusRate * 100).toFixed(0)}%)`} highlight />
                )}
                <Row label="Exchange wallet" value={`${EXCHANGE_ADDRESS?.slice(0, 8)}...${EXCHANGE_ADDRESS?.slice(-6)}`} />
                <Row label="Network fee" value="≈ 1–5 TRX" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-base border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSwap}
                  className="flex-1 py-3.5 bg-[#0500FF] text-white rounded-2xl font-bold text-base hover:bg-[#0400CC]"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-start justify-between">
      <span className={cn('text-sm', highlight ? 'text-[#0DB37E] font-semibold' : 'text-gray-500')}>{label}</span>
      <span className={cn('text-sm font-semibold text-right max-w-[60%] break-all', highlight ? 'text-[#0DB37E]' : 'text-gray-900')}>{value}</span>
    </div>
  )
}
