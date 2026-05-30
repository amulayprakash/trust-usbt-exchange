import { QRCodeSVG } from 'qrcode.react'
import { X, Copy, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WalletConnectModal({ uri, onClose, onRefresh }) {
  const copyUri = () => {
    if (uri) navigator.clipboard.writeText(uri)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[390px] bg-white rounded-t-3xl p-6 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Scan with Wallet</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {uri ? (
            <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl">
              <QRCodeSVG value={uri} size={200} />
            </div>
          ) : (
            <div className="w-[216px] h-[216px] bg-gray-100 rounded-2xl flex items-center justify-center">
              <RefreshCw size={24} className="text-gray-400 animate-spin" />
            </div>
          )}

          <p className="text-sm text-gray-500 text-center">
            Open Trust Wallet or any WalletConnect-compatible wallet and scan this QR code
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={copyUri}
              disabled={!uri}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200',
                'text-sm font-medium text-gray-700 hover:bg-gray-50',
                !uri && 'opacity-50 pointer-events-none'
              )}
            >
              <Copy size={16} />
              Copy Link
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0500FF] text-white text-sm font-medium hover:bg-[#0400CC]"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
