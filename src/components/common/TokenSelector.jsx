import { X } from 'lucide-react'
import TokenIcon from '@/components/tokens/TokenIcon'
import useWalletStore from '@/store/useWalletStore'
import { formatBalance } from '@/lib/formatters'

const TOKENS = [
  { symbol: 'USBT', name: 'USBT Token', network: 'Tron' },
  { symbol: 'USDT', name: 'Tether', network: 'Tron' },
  { symbol: 'TRX', name: 'Tron', network: 'Tron' },
]

export default function TokenSelector({ onSelect, exclude, onClose }) {
  const { balances } = useWalletStore()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[390px] bg-white rounded-t-3xl pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Select Token</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="py-2">
          {TOKENS.filter((t) => t.symbol !== exclude).map((token) => (
            <button
              key={token.symbol}
              onClick={() => { onSelect(token.symbol); onClose() }}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-100 active:bg-gray-200"
            >
              <TokenIcon symbol={token.symbol} size={40} />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-gray-900">{token.symbol}</p>
                <p className="text-xs font-semibold text-gray-500">{token.name} · {token.network}</p>
              </div>
              <span className="text-sm text-gray-700">{formatBalance(balances[token.symbol] || '0')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
