import { useQuery } from '@tanstack/react-query'
import { tronGridFetch, CONTRACTS, TOKEN_DECIMALS } from '@/config/tron'
import useWalletStore from '@/store/useWalletStore'
import { updateWalletBalances } from '@/lib/supabaseDb'

const DECIMALS_BY_CONTRACT = {
  [CONTRACTS.USBT]: TOKEN_DECIMALS.USBT,
  [CONTRACTS.USDT]: TOKEN_DECIMALS.USDT,
}

async function fetchBalances(address) {
  const data = await tronGridFetch(`/v1/accounts/${address}`)
  const account = data?.data?.[0]

  if (!account) return { TRX: '0.000000', USBT: '0.000000', USDT: '0.000000' }

  // TRX balance (in sun, 1 TRX = 1_000_000 sun)
  const trx = ((account.balance || 0) / 1_000_000).toFixed(6)

  // TRC20 balances — array of { contractAddress: rawBalance } objects
  const trc20Map = {}
  for (const entry of account.trc20 || []) {
    Object.assign(trc20Map, entry)
  }

  const parseToken = (contract) => {
    const raw = trc20Map[contract]
    if (!raw) return '0.000000'
    const decimals = DECIMALS_BY_CONTRACT[contract] ?? 6
    return (Number(raw) / Math.pow(10, decimals)).toFixed(6)
  }

  return {
    TRX: trx,
    USBT: parseToken(CONTRACTS.USBT),
    USDT: parseToken(CONTRACTS.USDT),
  }
}

export default function useTokenBalances() {
  const { address, setBalances } = useWalletStore()

  return useQuery({
    queryKey: ['balances', address],
    queryFn: async () => {
      const result = await fetchBalances(address)
      setBalances(result)
      updateWalletBalances(address, result)
      return result
    },
    enabled: !!address,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
    retryDelay: 5_000,
  })
}
