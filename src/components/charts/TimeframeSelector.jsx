import { cn } from '@/lib/utils'

const FRAMES = ['1H', '1D', '1W', '1M', '1Y', 'All']

export default function TimeframeSelector({ value, onChange }) {
  return (
    <div className="flex items-center justify-around px-4 py-2 border-b border-gray-100">
      {FRAMES.map((frame) => (
        <button
          key={frame}
          onClick={() => onChange(frame)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            value === frame
              ? 'bg-gray-100 text-gray-900 font-semibold'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {frame}
        </button>
      ))}
    </div>
  )
}
