import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { buildTronWeb, verifyIncomingTx, sendTrc20, CONTRACTS } from '../_shared/tronUtils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { txHashIn, amountIn, userWallet } = await req.json()

    if (!txHashIn || !amountIn || !userWallet) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: txHashIn, amountIn, userWallet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const privateKey = Deno.env.get('EXCHANGE_WALLET_PRIVATE_KEY')!
    const exchangeAddress = Deno.env.get('EXCHANGE_WALLET_ADDRESS')!

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Guard against duplicate processing
    const { data: existing } = await supabase
      .from('swap_requests')
      .select('id')
      .eq('tx_hash_in', txHashIn)
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'This transaction has already been processed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Verify the USDT was actually sent to the exchange wallet
    await verifyIncomingTx(txHashIn, CONTRACTS.USDT, exchangeAddress, amountIn)

    const now = new Date().toISOString()
    const { data: record, error: insertError } = await supabase
      .from('swap_requests')
      .insert({
        type: 'usdt_to_usbt',
        user_wallet: userWallet,
        amount_in: amountIn,
        amount_out: amountIn, // 1:1
        tx_hash_in: txHashIn,
        tx_hash_out: null,
        status: 'processing',
        created_at: now,
        updated_at: now,
        rejection_reason: null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    try {
      const tronWeb = buildTronWeb(privateKey)
      const txHashOut = await sendTrc20(tronWeb, 'USBT', userWallet, amountIn)

      await supabase
        .from('swap_requests')
        .update({ tx_hash_out: txHashOut, status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', record.id)

      return new Response(
        JSON.stringify({ requestId: record.id, txHashOut, status: 'completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      await supabase
        .from('swap_requests')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', record.id)

      throw new Error(`Failed to send USBT: ${err.message}`)
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
