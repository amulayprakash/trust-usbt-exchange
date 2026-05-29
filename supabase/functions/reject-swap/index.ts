import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { buildTronWeb, verifyOwnerSignature } from '../_shared/tronUtils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { requestId, signature, signerAddress, reason } = await req.json()

    if (!requestId || !signature || !signerAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: requestId, signature, signerAddress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const privateKey = Deno.env.get('EXCHANGE_WALLET_PRIVATE_KEY')!
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

    if (record.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Request status is '${record.status}', expected 'pending'` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await supabase
      .from('swap_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason || 'Rejected by owner',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    return new Response(
      JSON.stringify({ requestId, status: 'rejected' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
