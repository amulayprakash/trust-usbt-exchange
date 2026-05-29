import { useQuery } from '@tanstack/react-query'
import { tronGridFetch, CONTRACTS } from '@/config/tron'

const TOKEN_SYMBOL = {
  [CONTRACTS.USBT.toLowerCase()]: 'USBT',
  [CONTRACTS.USDT.toLowerCase()]: 'USDT',
}

async function fetchTransactions(address) {
  const [trxData, trc20Data] = await Promise.all([
    tronGridFetch(`/v1/accounts/${address}/transactions`, {
      only_confirmed: true,
      limit: 30,
    }),
    tronGridFetch(`/v1/accounts/${address}/transactions/trc20`, {
      only_confirmed: true,
      limit: 30,
      contract_address: [CONTRACTS.USBT, CONTRACTS.USDT].join(','),
    }),
  ])

  const trxTxs = (trxData.data || []).map((tx) => {
    const contract = tx.raw_data?.contract?.[0]
    const value = contract?.parameter?.value
    return {
      id: tx.txID,
      type: value?.to_address ? 'send' : 'receive',
      symbol: 'TRX',
      amount: ((value?.amount || 0) / 1_000_000).toFixed(6),
      from: value?.owner_address || '',
      to: value?.to_address || '',
      timestamp: tx.block_timestamp,
      status: tx.ret?.[0]?.contractRet === 'SUCCESS' ? 'confirmed' : 'failed',
    }
  })

  const trc20Txs = (trc20Data.data || []).map((tx) => {
    const contractAddr = tx.token_info?.address?.toLowerCase()
    return {
      id: tx.transaction_id,
      type: tx.from === address ? 'send' : 'receive',
      symbol: TOKEN_SYMBOL[contractAddr] || tx.token_info?.symbol || '?',
      amount: (Number(tx.value) / Math.pow(10, tx.token_info?.decimals || 6)).toFixed(6),
      from: tx.from,
      to: tx.to,
      timestamp: tx.block_timestamp,
      status: 'confirmed',
    }
  })

  return [...trxTxs, ...trc20Txs].sort((a, b) => b.timestamp - a.timestamp)
}

export default function useTransactions(address) {
  return useQuery({
    queryKey: ['transactions', address],
    queryFn: () => fetchTransactions(address),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
  })
}
