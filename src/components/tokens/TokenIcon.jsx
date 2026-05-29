import { useState } from 'react'
import { cn } from '@/lib/utils'

const LOGO_SRCS = {
  USBT: '/tokens/usbt.png',
  USDT: '/tokens/usdt.png',
  TRX:  '/tokens/trx.png',
}

const FALLBACK_COLORS = {
  USBT: 'from-green-400 to-teal-500',
  USDT: 'from-green-500 to-green-700',
  TRX:  'from-red-500 to-red-700',
}

export default function TokenIcon({ symbol, size = 40, className }) {
  const [errored, setErrored] = useState(false)
  const src = LOGO_SRCS[symbol]

  if (src && !errored) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn('flex-shrink-0 flex items-center justify-center', className)}
      >
        <img
          src={src}
          alt={symbol}
          width={size}
          height={size}
          style={{ objectFit: 'contain', display: 'block' }}
          onError={() => setErrored(true)}
        />
      </div>
    )
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'rounded-full flex items-center justify-center bg-gradient-to-br flex-shrink-0',
        FALLBACK_COLORS[symbol] || 'from-blue-400 to-purple-500',
        className
      )}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>
        {symbol?.slice(0, 2) || '?'}
      </span>
    </div>
  )
}
