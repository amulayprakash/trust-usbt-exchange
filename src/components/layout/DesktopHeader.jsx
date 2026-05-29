import { Settings, Copy, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useWalletStore from '@/store/useWalletStore'
import useTronWallet from '@/hooks/useTronWallet'

export default function DesktopHeader() {
  const { address, connectionType } = useWalletStore()
  const { disconnect: disconnectWallet } = useTronWallet()
  const navigate = useNavigate()

  const copyAddress = () => {
    if (address) navigator.clipboard.writeText(address)
  }

  const handleDisconnect = async () => {
    await disconnectWallet()
    navigate('/landing', { replace: true })
  }

  return (
    <header className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md shadow-blue-500/20">
          <img src="/usbt-lolo.png" className="w-full h-full object-cover" alt="USBT" />
        </div>
        <span className="text-base font-bold text-gray-900 tracking-tight">USBT Exchange</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3375BB]/10 text-[#3375BB] font-bold uppercase tracking-wide">
          Tron
        </span>
      </div>

      {/* Wallet pill */}
      <button
        onClick={copyAddress}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-gray-200 hover:border-[#3375BB]/40 hover:bg-gray-50 transition-colors"
      >
        <div className="relative flex-shrink-0 w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
          <span className="absolute inset-0 rounded-full bg-emerald-400" />
        </div>
        {connectionType === 'walletconnect' && (
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#3375BB]/70">WC</span>
        )}
        <div className="text-left">
          <p className="text-xs font-semibold text-gray-900 leading-none">
            {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect Wallet'}
          </p>
          {address && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {connectionType === 'walletconnect' ? 'via WalletConnect' : 'via TronLink'}
            </p>
          )}
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1">
<button
          onClick={copyAddress}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Copy size={18} />
        </button>
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
          <Settings size={18} />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={handleDisconnect}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          title="Disconnect wallet"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
