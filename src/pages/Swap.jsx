import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowUpDown, Loader2, ChevronRight, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import TokenIcon from '@/components/tokens/TokenIcon'
import TokenSelector from '@/components/common/TokenSelector'
import useWalletStore from '@/store/useWalletStore'
import useAppStore from '@/store/useAppStore'
import { getSwapQuote, executeSwap } from '@/hooks/useSunSwap'
import { formatBalance } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { saveTransaction } from '@/lib/supabaseDb'

export default function Swap() {
  const navigate = useNavigate()
  const { address, balances, isConnected } = useWalletStore()
  const { slippage, swapFromToken, swapToToken, setSwapPair } = useAppStore()

  const [fromAmount, setFromAmount] = useState('')
  const [quote, setQuote] = useState(null)
  const [quoting, setQuoting] = useState(false)
  const [tokenSelectorFor, setTokenSelectorFor] = useState(null)
  const [executing, setExecuting] = useState(false)
  const [rotated, setRotated] = useState(false)

  const fromBalance = balances[swapFromToken] || '0'
  const toBalance = balances[swapToToken] || '0'

  const fetchQuote = useCallback(async () => {
    if (!fromAmount || Number(fromAmount) <= 0) { setQuote(null); return }
    setQuoting(true)
    try {
      const q = await getSwapQuote(swapFromToken, swapToToken, fromAmount, slippage)
      setQuote(q)
    } catch { setQuote(null) }
    finally { setQuoting(false) }
  }, [fromAmount, swapFromToken, swapToToken, slippage])

  useEffect(() => {
    const t = setTimeout(fetchQuote, 500)
    return () => clearTimeout(t)
  }, [fetchQuote])

  const handleSwapTokens = () => {
    setRotated((r) => !r)
    setSwapPair(swapToToken, swapFromToken)
    setFromAmount('')
    setQuote(null)
  }

  const handleConfirmSwap = async () => {
    if (!isConnected) { navigate('/landing'); return }
    if (!quote) return
    setExecuting(true)
    try {
      const txHash = await executeSwap(swapFromToken, swapToToken, fromAmount, quote.minOut, address)
      toast.success(`Swap confirmed! TX: ${txHash.slice(0, 16)}...`)
      saveTransaction({
        walletAddress: address,
        type: 'swap',
        token: swapFromToken,
        toToken: swapToToken,
        amount: fromAmount,
        toAmount: quote.amountOut,
        txHash,
        fromAddress: address,
      })
      setFromAmount('')
      setQuote(null)
    } catch (e) {
      toast.error(e.message || 'Swap failed')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <span className="text-base font-bold text-gray-900 border-b-2 border-[#0500FF] pb-0.5">Swap</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-4 pt-2">
        {/* From */}
        <div className="bg-gray-200 rounded-2xl p-4 mb-1 relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-600">From</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Wallet size={13} className="text-gray-500" />
              <span>{formatBalance(fromBalance)}</span>
              {['25%', '50%', 'Max'].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    const mult = pct === 'Max' ? 1 : pct === '50%' ? 0.5 : 0.25
                    setFromAmount((Number(fromBalance) * mult).toFixed(6))
                  }}
                  className="px-2 py-0.5 bg-[#0500FF] text-white rounded-full text-[10px] font-semibold"
                >
                  {pct}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTokenSelectorFor('from')}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-300 hover:border-[#0500FF] transition-colors flex-shrink-0"
            >
              <TokenIcon symbol={swapFromToken} size={28} />
              <span className="font-bold text-gray-900 text-base">{swapFromToken}</span>
              <ChevronRight size={14} className="text-gray-500" />
            </button>
            <input
              type="number"
              placeholder="0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="flex-1 min-w-0 text-right text-3xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
            />
          </div>
          <p className="text-sm text-gray-500 text-right mt-1">
            {fromAmount && Number(fromAmount) > 0 ? `≈ $${(Number(fromAmount) * 0.99).toFixed(4)}` : '$0'}
          </p>
        </div>

        {/* Swap arrow */}
        <div className="flex justify-center -my-3 z-10 relative">
          <motion.button
            animate={{ rotate: rotated ? 180 : 0 }}
            onClick={handleSwapTokens}
            className="w-10 h-10 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center shadow-sm hover:border-[#0500FF] transition-colors"
          >
            <ArrowUpDown size={18} className="text-gray-600" />
          </motion.button>
        </div>

        {/* To */}
        <div className="bg-gray-200 rounded-2xl p-4 mt-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-600">To</p>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Wallet size={13} className="text-gray-500" />
              {formatBalance(toBalance)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTokenSelectorFor('to')}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-300 hover:border-[#0500FF] transition-colors flex-shrink-0"
            >
              <TokenIcon symbol={swapToToken} size={28} />
              <span className="font-bold text-gray-900 text-base">{swapToToken}</span>
              <ChevronRight size={14} className="text-gray-500" />
            </button>
            <div className="flex-1 min-w-0 text-right overflow-hidden">
              {quoting ? (
                <Loader2 size={20} className="animate-spin text-gray-400 ml-auto" />
              ) : (
                <span className="text-3xl font-bold text-gray-900 block truncate">
                  {quote ? quote.amountOut : '0'}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 text-right mt-1">
            {quote ? `≈ $${(Number(quote.amountOut)).toFixed(4)}` : '$0'}
          </p>
        </div>

        {/* Quote details */}
        {quote && (
          <div className="mt-3 p-3 bg-blue-50 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Rate</span>
              <span className="text-gray-700 font-semibold">1 {swapFromToken} = {quote.rate} {swapToToken}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Price Impact</span>
              <span className="text-[#0DB37E] font-semibold">{quote.priceImpact}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Min. Received ({slippage}% slippage)</span>
              <span className="text-gray-700 font-semibold">{quote.minOut} {swapToToken}</span>
            </div>
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="px-4 pb-4 pt-3">
        <button
          onClick={handleConfirmSwap}
          disabled={!fromAmount || !quote || executing}
          className={cn(
            'w-full py-4 rounded-2xl font-bold text-lg transition-all',
            fromAmount && quote && !executing
              ? 'bg-[#0500FF] text-white hover:bg-[#0400CC] active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          {executing
            ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" />Swapping...</span>
            : !isConnected ? 'Connect Wallet'
            : !fromAmount ? 'Enter amount'
            : !quote ? 'Getting quote...'
            : 'Continue'
          }
        </button>
      </div>

      {/* Modals */}
      {tokenSelectorFor && (
        <TokenSelector
          exclude={tokenSelectorFor === 'from' ? swapFromToken : swapToToken}
          onSelect={(sym) => {
            if (tokenSelectorFor === 'from') setSwapPair(sym, swapToToken)
            else setSwapPair(swapFromToken, sym)
          }}
          onClose={() => setTokenSelectorFor(null)}
        />
      )}

    </div>
  )
}
