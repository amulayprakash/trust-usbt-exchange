import { useQuery } from '@tanstack/react-query'
import { CONTRACTS } from '@/config/tron'
import { supabase } from '@/config/supabase'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const USBT_ADDRESS = CONTRACTS.USBT

const TIMEFRAME_DAYS = {
  '1H': '1',
  '1D': '1',
  '1W': '7',
  '1M': '30',
  '1Y': '365',
  'All': 'max',
}

export function useUSDTPrice() {
  return useQuery({
    queryKey: ['price', 'usdt'],
    queryFn: async () => {
      try {
        const res = await fetch(
          `${COINGECKO_BASE}/simple/price?ids=tether&vs_currencies=usd&include_24hr_change=true`
        )
        if (!res.ok) throw new Error('CoinGecko request failed')
        const data = await res.json()
        return {
          usd: data.tether?.usd || 1,
          change24h: data.tether?.usd_24h_change || 0,
        }
      } catch {
        return { usd: 1, change24h: 0 }
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })
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

const COIN_IDS = { USBT: null, USDT: 'tether', TRX: 'tron' }

export function useTokenChart(symbol = 'USBT', timeframe = '1W') {
  const days = TIMEFRAME_DAYS[timeframe] || '1'

  return useQuery({
    queryKey: ['chart', symbol.toLowerCase(), timeframe],
    queryFn: async () => {
      let url
      if (symbol === 'USBT') {
        url = `${COINGECKO_BASE}/coins/tron/contract/${USBT_ADDRESS}/market_chart?vs_currency=usd&days=${days}`
      } else {
        const coinId = COIN_IDS[symbol]
        url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Chart data unavailable')
      const data = await res.json()
      let points = (data.prices || []).map(([ts, price]) => ({
        time: Math.floor(ts / 1000),
        value: price,
      }))
      if (timeframe === '1H') {
        const cutoff = Math.floor(Date.now() / 1000) - 3600
        points = points.filter(p => p.time >= cutoff)
      }
      return points
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
