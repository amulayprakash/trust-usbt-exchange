import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase'
import { fetchUserTransactions } from '@/lib/supabaseDb'

export default function useSupabaseTransactions(address) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) return
    setLoading(true)

    fetchUserTransactions(address)
      .then((data) => setTransactions(data))
      .catch(console.error)
      .finally(() => setLoading(false))

    const channel = supabase
      .channel(`user_txns_${address}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `wallet_address=eq.${address}` },
        async () => {
          const data = await fetchUserTransactions(address)
          setTransactions(data)
        },
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [address])

  return { transactions, loading }
}
