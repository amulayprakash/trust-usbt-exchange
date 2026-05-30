import { supabase } from '@/config/supabase'

export async function saveWallet(address, connectionType, balances = null) {
  try {
    const now = new Date().toISOString()

    const { data: existing } = await supabase
      .from('wallets')
      .select('first_connected')
      .eq('address', address)
      .single()

    const payload = {
      address,
      connection_type: connectionType,
      last_connected: now,
      ...(balances && { balances }),
      ...(!existing && { first_connected: now }),
    }

    await supabase.from('wallets').upsert(payload)
  } catch (err) {
    console.error('saveWallet error:', err)
  }
}

export async function updateWalletBalances(address, balances) {
  try {
    await supabase
      .from('wallets')
      .update({ balances, last_seen: new Date().toISOString() })
      .eq('address', address)
  } catch (err) {
    console.error('updateWalletBalances error:', err)
  }
}

export async function createSwapRequest({ type, userWallet, amountIn, txHashIn }) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('swap_requests')
    .insert({
      type,
      user_wallet: userWallet,
      amount_in: amountIn,
      amount_out: amountIn, // 1:1
      tx_hash_in: txHashIn,
      tx_hash_out: null,
      status: 'pending',
      created_at: now,
      updated_at: now,
      rejection_reason: null,
    })
    .select()
    .single()

  if (error) throw error
  return data.id
}

export function listenSwapRequest(requestId, callback) {
  // Fetch current state immediately
  supabase
    .from('swap_requests')
    .select()
    .eq('id', requestId)
    .single()
    .then(({ data }) => { if (data) callback(data) })

  const channel = supabase
    .channel(`swap_request_${requestId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'swap_requests', filter: `id=eq.${requestId}` },
      (payload) => callback(payload.new),
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function listenAllSwapRequests(callback) {
  // Fetch initial list
  supabase
    .from('swap_requests')
    .select()
    .order('created_at', { ascending: false })
    .then(({ data }) => { if (data) callback(data) })

  const channel = supabase
    .channel('all_swap_requests')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'swap_requests' },
      async () => {
        const { data } = await supabase
          .from('swap_requests')
          .select()
          .order('created_at', { ascending: false })
        if (data) callback(data)
      },
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export async function getAllWallets() {
  const { data, error } = await supabase
    .from('wallets')
    .select('address, connection_type, last_connected, first_connected, balances')
    .order('last_connected', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveTransaction({
  walletAddress,
  type,
  token,
  toToken = null,
  amount,
  toAmount = null,
  txHash,
  toAddress = null,
  fromAddress = null,
}) {
  try {
    await supabase.from('transactions').insert({
      wallet_address: walletAddress,
      type,
      token,
      to_token: toToken,
      amount,
      to_amount: toAmount,
      tx_hash: txHash,
      to_address: toAddress,
      from_address: fromAddress,
      status: 'confirmed',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('saveTransaction error:', err)
  }
}

export async function fetchUserTransactions(walletAddress) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('timestamp', { ascending: false })
  if (error) throw error
  return data || []
}
