import { ArrowLeft, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import QRCodeDisplay from '@/components/common/QRCodeDisplay'
import useWalletStore from '@/store/useWalletStore'

export default function Receive() {
  const navigate = useNavigate()
  const { address } = useWalletStore()

  const handleShare = () => {
    if (navigator.share && address) {
      navigator.share({ title: 'My Tron Address', text: address })
    }
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
        <h1 className="text-base font-bold text-gray-900">Receive</h1>
        <button
          onClick={handleShare}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
        >
          <Share2 size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-6 gap-5">
        {/* Network badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-full border border-gray-300">
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">T</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">Tron TRC20</span>
        </div>

        {/* QR */}
        <QRCodeDisplay address={address} size={200} />

        {/* Warning */}
        <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700 text-center font-medium">
            ⚠️ Only send TRC20 (Tron) tokens to this address
          </p>
        </div>
      </div>
    </div>
  )
}
