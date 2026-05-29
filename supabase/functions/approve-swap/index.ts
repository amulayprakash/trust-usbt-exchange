import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { buildTronWeb, verifyIncomingTx, sendTrc20, verifyOwnerSignature, CONTRACTS } from '../_shared/tronUtils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { requestId, signature, signerAddress } = await req.json()

    if (!requestId || !signature || !signerAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: requestId, signature, signerAddress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const privateKey = Deno.env.get('EXCHANGE_WALLET_PRIVATE_KEY')!
    const exchangeAddress = Deno.env.get('EXCHANGE_WALLET_ADDRESS')!
    const ownerAddress = Deno.env.get('OWNER_ADDRESS')!

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const tronWeb = buildTronWeb(privateKey)

    await verifyOwnerSignature(tronWeb, requestId, signature, signerAddress, ownerAddress)

    const { data: record, error: fetchError } = await supabase
      .from('swap_requests')
      .select()
      .eq('id', requestId)
      .single()

    if (fetchError || !record) {
      return new Response(
        JSON.stringify({ error: 'Swap request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (record.type !== 'usbt_to_usdt') {
      return new Response(
        JSON.stringify({ error: 'This request is not a USBT → USDT swap' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (record.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Request status is '${record.status}', expected 'pending'` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Verify the user's USBT TX on-chain
    await verifyIncomingTx(record.tx_hash_in, CONTRACTS.USBT, exchangeAddress, record.amount_in)

    await supabase
      .from('swap_requests')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    try {
      const txHashOut = await sendTrc20(tronWeb, 'USDT', record.user_wallet, record.amount_out)

      await supabase
        .from('swap_requests')
        .update({ tx_hash_out: txHashOut, status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', requestId)

      return new Response(
        JSON.stringify({ requestId, txHashOut, status: 'completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      // Roll back to pending so owner can retry
      await supabase
        .from('swap_requests')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', requestId)

      throw new Error(`Failed to send USDT: ${err.message}`)
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
