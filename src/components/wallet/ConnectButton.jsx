import { useState } from 'react'
import { Wallet } from 'lucide-react'
import WalletModal from '@/components/wallet/WalletModal'
import { cn } from '@/lib/utils'

export default function ConnectButton({ dark = false, className }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]',
          dark
            ? 'text-white hover:opacity-90'
            : 'text-gray-900 hover:opacity-90',
          className
        )}
        style={dark ? {
          background: 'rgba(0,229,255,0.10)',
          border: '1px solid rgba(0,229,255,0.22)',
        } : {
          background: '#00e5ff',
          boxShadow: '0 0 20px rgba(0,229,255,0.30)',
        }}
      >
        <Wallet size={17} />
        Connect Wallet
      </button>

      <WalletModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
