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

// USBT price is fixed at $0.99
export function useUSBTPrice() {
  return useQuery({
    queryKey: ['price', 'usbt'],
    queryFn: () => ({ usd: 0.99, inr: 0 }),
    staleTime: Infinity,
  })
}

export function useTRXPrice() {
  return useQuery({
    queryKey: ['price', 'trx'],
    queryFn: async () => {
      try {
        const res = await fetch(
          `${COINGECKO_BASE}/simple/price?ids=tron&vs_currencies=usd&include_24hr_change=true`
        )
        if (!res.ok) throw new Error('CoinGecko request failed')
        const data = await res.json()
        return {
          usd: data.tron?.usd || 0,
          change24h: data.tron?.usd_24h_change || 0,
        }
      } catch {
        const { data: row } = await supabase
          .from('price_cache')
          .select()
          .eq('token', 'TRX')
          .single()
        if (row) return { usd: row.price_usd, change24h: 0 }
        return { usd: 0, change24h: 0 }
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })
}

export function useUSBTChart(timeframe = '1W') {
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
