import { useQuery } from '@tanstack/react-query'
import { CONTRACTS } from '@/config/tron'
import { supabase } from '@/config/supabase'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const USBT_ADDRESS = CONTRACTS.USBT

const TIMEFRAME_DAYS = {
  '1H': '0.04',
  '1D': '1',
  '1W': '7',
  '1M': '30',
  '1Y': '365',
  'All': 'max',
}

export function useUSBTPrice() {
  return useQuery({
    queryKey: ['price', 'usbt'],
    queryFn: async () => {
      try {
        const res = await fetch(
          `${COINGECKO_BASE}/simple/token_price/tron?contract_addresses=${USBT_ADDRESS}&vs_currencies=usd,inr`
        )
        if (!res.ok) throw new Error('CoinGecko request failed')
        const data = await res.json()
        const priceData = data[USBT_ADDRESS.toLowerCase()] || {}
        const result = { usd: priceData.usd || 0, inr: priceData.inr || 0 }

        if (result.usd > 0) {
          supabase.from('price_cache').upsert({
            token: 'USBT',
            price_usd: result.usd,
            price_inr: result.inr,
            updated_at: new Date().toISOString(),
          }).then(() => {})
        }

        return result
      } catch {
        // Fallback to Supabase price_cache
        const { data: row } = await supabase
          .from('price_cache')
          .select()
          .eq('token', 'USBT')
          .single()
        if (row) return { usd: row.price_usd, inr: row.price_inr }
        return { usd: 0, inr: 0 }
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })
}

export function useUSBTChart(timeframe = '1D') {
  const days = TIMEFRAME_DAYS[timeframe] || '1'

  return useQuery({
    queryKey: ['chart', 'usbt', timeframe],
    queryFn: async () => {
      const res = await fetch(
        `${COINGECKO_BASE}/coins/tron/contract/${USBT_ADDRESS}/market_chart?vs_currency=usd&days=${days}`
      )
      if (!res.ok) throw new Error('Chart data unavailable')
      const data = await res.json()
      return (data.prices || []).map(([ts, price]) => ({
        time: Math.floor(ts / 1000),
        value: price,
      }))
    },
    staleTime: 60_000,
    retry: 1,
  })
}

export function useTronEcosystemPrices() {
  return useQuery({
    queryKey: ['trending', 'tron'],
    queryFn: async () => {
      const res = await fetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&category=tron-ecosystem&order=market_cap_desc&per_page=20&page=1&price_change_percentage=24h`
      )
      if (!res.ok) throw new Error('Failed to fetch trending')
      return res.json()
    },
    staleTime: 120_000,
    retry: 1,
  })
}
