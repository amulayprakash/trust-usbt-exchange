import { X } from 'lucide-react'
import { useState } from 'react'
import useAppStore from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const PRESETS = [0.5, 1, 2, 3]

export default function SlippageSettings({ onClose }) {
  const { slippage, setSlippage } = useAppStore()
  const [custom, setCustom] = useState('')
  const [useCustom, setUseCustom] = useState(!PRESETS.includes(slippage))

  const handlePreset = (val) => {
    setSlippage(val)
    setUseCustom(false)
    setCustom('')
  }

  const handleCustom = (val) => {
    setCustom(val)
    const n = Number(val)
    if (!isNaN(n) && n > 0 && n <= 50) {
      setSlippage(n)
      setUseCustom(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[390px] bg-white rounded-t-3xl p-5 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">Slippage Tolerance</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                !useCustom && slippage === p
                  ? 'bg-[#3375BB] text-white border-[#3375BB]'
                  : 'bg-gray-200 text-gray-700 border-gray-300 hover:border-[#3375BB]'
              )}
            >
              {p}%
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Custom"
            value={custom}
            onChange={(e) => handleCustom(e.target.value)}
            className={cn(
              'flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium outline-none',
              useCustom ? 'border-[#3375BB] bg-blue-100' : 'border-gray-300 bg-gray-200'
            )}
          />
          <span className="text-gray-500 font-medium">%</span>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Your transaction will revert if the price changes more than {slippage}% unfavorably.
        </p>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-[#3375BB] text-white rounded-2xl font-semibold text-sm hover:bg-[#2560a0] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
