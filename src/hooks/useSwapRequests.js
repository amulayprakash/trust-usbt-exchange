import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase'

export default function useSwapRequests(address) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) return
    setLoading(true)

    supabase
      .from('swap_requests')
      .select()
      .eq('user_wallet', address)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setRequests(data)
        setLoading(false)
      })

    const channel = supabase
      .channel(`user_swaps_${address}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'swap_requests', filter: `user_wallet=eq.${address}` },
        async () => {
          const { data } = await supabase
            .from('swap_requests')
            .select()
            .eq('user_wallet', address)
            .order('created_at', { ascending: false })
          if (data) setRequests(data)
        },
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [address])

  return { requests, loading }
}
