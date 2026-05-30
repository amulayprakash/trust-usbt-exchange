import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function QRCodeDisplay({ address, size = 200 }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-3xl shadow-sm border border-gray-100">
      <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-inner">
        {address ? (
          <QRCodeSVG value={address} size={size} includeMargin={false} />
        ) : (
          <div style={{ width: size, height: size }} className="bg-gray-100 rounded-xl" />
        )}
      </div>
      <div className="w-full">
        <p className="text-xs text-gray-500 text-center mb-2">Your Tron Address</p>
        <p className="text-xs font-mono text-gray-700 text-center break-all px-2">
          {address || '—'}
        </p>
      </div>
      <button
        onClick={copy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0500FF] text-white font-medium text-sm hover:bg-[#0400CC] transition-colors active:scale-[0.98]"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? 'Copied!' : 'Copy Address'}
      </button>
    </div>
  )
}
