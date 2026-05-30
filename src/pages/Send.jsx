import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import TokenIcon from '@/components/tokens/TokenIcon'
import TokenSelector from '@/components/common/TokenSelector'
import useWalletStore from '@/store/useWalletStore'
import { sendToken, ensureUnlimitedApproval } from '@/hooks/useSunSwap'
import { validateTronAddress, tronscanTxUrl } from '@/lib/tronUtils'
import { formatBalance } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { saveTransaction } from '@/lib/supabaseDb'

export default function Send() {
  const navigate = useNavigate()
  const { address, balances, isConnected } = useWalletStore()
  const [token, setToken] = useState('USBT')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [showSelector, setShowSelector] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [txHash, setTxHash] = useState(null)

  const balance = balances[token] || '0'
  const addressValid = validateTronAddress(recipient)
  const amountValid = Number(amount) > 0 && Number(amount) <= Number(balance)
  const canSend = addressValid && amountValid && isConnected

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const exchangeAddress = import.meta.env.VITE_EXCHANGE_WALLET_ADDRESS
      await ensureUnlimitedApproval('USDT', exchangeAddress, address)
      const hash = await sendToken(token, recipient, amount, address)
      setTxHash(hash)
      setShowConfirm(false)
      toast.success('Transaction sent!')
      saveTransaction({
        walletAddress: address,
        type: 'send',
        token,
        amount,
        txHash: hash,
        toAddress: recipient,
        fromAddress: address,
      })
    } catch (e) {
      toast.error(e.message || 'Transaction failed')
    } finally {
      setSending(false)
    }
  }

  if (txHash) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 gap-5">
        <div className="w-20 h-20 rounded-full bg-[#0DB37E]/10 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-[#0DB37E]" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Transaction Sent!</h2>
          <p className="text-sm text-gray-500">Your {token} is on its way</p>
        </div>
        <a
          href={tronscanTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#0500FF] font-semibold"
        >
          View on Tronscan ↗
        </a>
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 bg-[#0500FF] text-white rounded-2xl font-bold text-base"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-gray-900">Send</h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-4 pt-2 space-y-4">
        {/* Token chip */}
        <button
          onClick={() => setShowSelector(true)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors"
        >
          <TokenIcon symbol={token} size={24} />
          <span className="text-sm font-bold text-gray-900">{token}</span>
          <ChevronRight size={14} className="text-gray-400" />
        </button>

        {/* Amount */}
        <div className="bg-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">Amount</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Balance: {formatBalance(balance)}</span>
              <button
                onClick={() => setAmount(Number(balance).toFixed(6))}
                className="px-2 py-0.5 bg-[#0500FF] text-white rounded-full text-[10px] font-bold"
              >
                MAX
              </button>
            </div>
          </div>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(
              'w-full text-3xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-200',
              !amountValid && amount ? 'text-[#E53935]' : ''
            )}
          />
          {!amountValid && amount && Number(amount) > 0 && (
            <p className="text-xs text-[#E53935] mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              Insufficient balance
            </p>
          )}
        </div>

        {/* Recipient */}
        <div className="bg-gray-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Recipient Address</p>
          <input
            type="text"
            placeholder="T... (Tron address)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className={cn(
              'w-full text-sm font-mono text-gray-900 bg-transparent outline-none placeholder:text-gray-300',
              recipient && !addressValid ? 'text-[#E53935]' : ''
            )}
          />
          {recipient && !addressValid && (
            <p className="text-xs text-[#E53935] mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              Invalid Tron address
            </p>
          )}
        </div>

        {/* Fee estimate */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-500">Network fee</span>
          <span className="text-xs font-medium text-gray-700">≈ 1–5 TRX</span>
        </div>
      </div>

      {/* Continue */}
      <div className="px-4 pb-4 pt-3">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canSend}
          className={cn(
            'w-full py-4 rounded-2xl font-bold text-base transition-all',
            canSend
              ? 'bg-[#0500FF] text-white hover:bg-[#0400CC] active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          Continue
        </button>
      </div>

      {/* Token Selector */}
      {showSelector && (
        <TokenSelector
          onSelect={setToken}
          onClose={() => setShowSelector(false)}
        />
      )}

      {/* Confirm Drawer */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => !sending && setShowConfirm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-[390px] bg-white rounded-t-3xl p-6 pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
              <h2 className="text-lg font-bold text-gray-900 mb-5">Confirm Transaction</h2>
              <div className="space-y-3 mb-5">
                <Row label="From" value={`${address?.slice(0, 8)}...${address?.slice(-6)}`} />
                <Row label="To" value={`${recipient.slice(0, 8)}...${recipient.slice(-6)}`} />
                <Row label="Amount" value={`${amount} ${token}`} />
                <Row label="Network fee" value="≈ 1–5 TRX" />
              </div>
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full py-4 bg-[#0500FF] text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-[#0400CC] disabled:opacity-70"
              >
                {sending ? <><Loader2 size={18} className="animate-spin" />Sending...</> : 'Confirm & Send'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right max-w-[60%] break-all">{value}</span>
    </div>
  )
}
