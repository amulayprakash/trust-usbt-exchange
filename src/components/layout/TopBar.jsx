import { useState } from 'react'
import { Settings, ChevronDown, Copy, Check, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useWalletStore from '@/store/useWalletStore'
import useTronWallet from '@/hooks/useTronWallet'
import { cn } from '@/lib/utils'

const IconBtn = ({ onClick, disabled, className, children }) => (
  <motion.button
    whileTap={{ scale: 0.84 }}
    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
    onClick={onClick}
    disabled={disabled}
    className={cn('w-9 h-9 flex items-center justify-center rounded-full transition-colors', className)}
  >
    {children}
  </motion.button>
)

export default function TopBar() {
  const { address, connectionType } = useWalletStore()
  const { disconnect: disconnectWallet } = useTronWallet()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDisconnect = async () => {
    await disconnectWallet()
    navigate('/landing', { replace: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 relative"
    >
      <IconBtn className="hover:bg-gray-100 text-gray-600">
        <Settings size={20} />
      </IconBtn>

      <motion.button
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <span className="relative flex-shrink-0 w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
          <span className="absolute inset-0 rounded-full bg-emerald-400" />
        </span>
        {connectionType === 'walletconnect' && (
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0500FF]/70">WC</span>
        )}
        <span className="text-sm font-semibold text-gray-900 font-mono">
          {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect Wallet'}
        </span>
        <ChevronDown size={14} className="text-gray-500" />
      </motion.button>

      <div className="flex items-center gap-1">
        {/* Copy address button */}
        <IconBtn
          onClick={copyAddress}
          disabled={!address}
          className={cn('hover:bg-gray-100 text-gray-600', !address && 'opacity-40 pointer-events-none')}
        >
          {copied ? <Check size={18} className="text-[#0DB37E]" /> : <Copy size={18} />}
        </IconBtn>
        <IconBtn onClick={handleDisconnect} className="hover:bg-red-50 text-gray-400 hover:text-red-500">
          <LogOut size={18} />
        </IconBtn>
      </div>

      {/* "Address copied" toast */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-[-38px] z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium shadow-lg pointer-events-none"
          >
            <Check size={12} className="text-[#0DB37E]" />
            Address copied
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
