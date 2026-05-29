import { TrendingUp, TrendingDown } from 'lucide-react'
import { useTronEcosystemPrices } from '@/hooks/useTokenPrice'
import { cn } from '@/lib/utils'

export default function Trending() {
  const { data: tokens = [], isLoading } = useTronEcosystemPrices()

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Trending on Tron</h2>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-300 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && tokens.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <TrendingUp size={40} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">No data available</p>
          <p className="text-xs mt-1">CoinGecko rate limit may apply</p>
        </div>
      )}

      <div className="space-y-2">
        {tokens.map((token, i) => {
          const change = token.price_change_percentage_24h || 0
          const positive = change >= 0
          return (
            <div key={token.id} className="flex items-center gap-3 p-3 bg-gray-200 rounded-2xl">
              <span className="text-sm text-gray-500 w-5 font-semibold">{i + 1}</span>
              <img
                src={token.image}
                alt={token.symbol}
                className="w-10 h-10 rounded-full flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{token.name}</p>
                <p className="text-xs font-medium text-gray-500">
                  MCap: ${(token.market_cap / 1e6).toFixed(1)}M · Vol: ${(token.total_volume / 1e6).toFixed(1)}M
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">${token.current_price?.toFixed(4)}</p>
                <p className={cn('text-xs font-medium flex items-center justify-end gap-0.5', positive ? 'text-[#0DB37E]' : 'text-[#E53935]')}>
                  {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {positive ? '+' : ''}{change.toFixed(2)}%
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
