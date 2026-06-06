import { getTronWeb, CONTRACTS, SUNSWAP_V2_ABI, TRC20_ABI, TOKEN_DECIMALS } from '@/config/tron'
import { toast } from 'sonner'
import useWalletStore from '@/store/useWalletStore'
import { getWcWallet } from '@/hooks/useTronWallet'

const UINT256_MAX = (2n ** 256n - 1n).toString()
const UNLIMITED_THRESHOLD = 2n ** 128n

const TRONGRID_URL = 'https://api.trongrid.io'

// Minimal base58 decoder to convert TRON base58 address → 20-byte EVM hex for ABI encoding.
// TRON address bytes: [0x41][20-byte EVM address][4-byte checksum] = 25 bytes
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function tronAddrToEvmHex(addr) {
  const bytes = [0]
  for (const c of addr) {
    let carry = BASE58_CHARS.indexOf(c)
    if (carry < 0) throw new Error('Invalid base58 character in address')
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  for (const c of addr) {
    if (c === '1') bytes.push(0)
    else break
  }
  // bytes reversed = [prefix 0x41][20-byte EVM addr][4-byte checksum]
  const full = bytes.reverse()
  return full.slice(1, 21).map(b => b.toString(16).padStart(2, '0')).join('')
}

function tronGridHeaders() {
  const apiKey = import.meta.env.VITE_TRONGRID_API_KEY
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {}),
  }
}

// WalletConnect path: builds unsigned tx via TronGrid REST, signs via wcWalletInstance, broadcasts.
// No TronWeb needed — avoids the "TronWeb is not a constructor" crash on mobile Safari.
async function sendTokenWalletConnect(symbol, toAddress, amount, fromAddress) {
  const wcWallet = getWcWallet()
  if (!wcWallet) throw new Error('WalletConnect session not found. Please reconnect your wallet.')

  const decimals = TOKEN_DECIMALS[symbol] ?? 6
  const amountBig = BigInt(Math.floor(Number(amount) * Math.pow(10, decimals)))

  // ABI-encode transfer(address, uint256): 32-byte padded EVM address + 32-byte padded amount
  const evmHex = tronAddrToEvmHex(toAddress)
  const parameter = evmHex.padStart(64, '0') + amountBig.toString(16).padStart(64, '0')

  const headers = tronGridHeaders()

  // Use the live WalletConnect session address as owner_address.
  // The Zustand store address may be stale (from a previous TronLink session or a different
  // WC account), which would cause a SIGERROR because the signer wouldn't match owner_address.
  const ownerAddress = wcWallet.address || fromAddress

  // Step 1: build unsigned TRC20 transfer transaction
  const buildRes = await fetch(`${TRONGRID_URL}/wallet/triggersmartcontract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      owner_address: ownerAddress,
      contract_address: CONTRACTS[symbol],
      function_selector: 'transfer(address,uint256)',
      parameter,
      fee_limit: 50_000_000,
      call_value: 0,
      visible: true,
    }),
  })

  const buildResult = await buildRes.json()
  if (!buildResult?.transaction) {
    throw new Error(buildResult?.message || 'Failed to build transaction via TronGrid')
  }

  // Some wallets require signature to be an empty array on unsigned transactions
  const unsignedTx = { ...buildResult.transaction }
  if (!unsignedTx.signature) unsignedTx.signature = []

  // Step 2: sign via WalletConnect
  // @tronweb3/walletconnect-tron v4 double-wraps the tx for "v2" wallets as { transaction: { tx } }
  // but most wallets (Trust Wallet, TronLink) expect the flat v1 format { transaction: tx }.
  // We bypass the adapter and call the underlying UniversalProvider directly with the v1 format.
  const wcClient = wcWallet._client
  const wcSession = wcWallet._session

  // Auto-open the connected wallet app on same-device iOS (so user doesn't have to manually switch)
  const redirect = wcSession?.peer?.metadata?.redirect
  const redirectUrl = redirect?.native ?? redirect?.universal
  if (redirectUrl) {
    window.location.href = redirectUrl
  }

  let signedTx
  try {
    let result
    if (wcClient && wcSession) {
      // v1 format: params.transaction is the tx object directly (not double-wrapped)
      result = await wcClient.request({
        chainId: 'tron:0x2b6653dc',
        topic: wcSession.topic,
        request: {
          method: 'tron_signTransaction',
          params: { address: ownerAddress, transaction: unsignedTx },
        },
      })
    } else {
      result = await wcWallet.signTransaction(unsignedTx)
    }
    // Some wallets return { result: signedTx }, others return the signedTx directly
    signedTx = result?.result ?? result
  } catch (err) {
    const msg = err?.message || String(err)
    throw new Error(`Signing failed: ${msg}. Please confirm quickly in your wallet and try again.`)
  }

  if (!signedTx) throw new Error('No signed transaction received. Please try again.')

  // Normalise the signed tx to a broadcastable object.
  // Trust Wallet may return: a signature string, { signature: '...' }, { txID, raw_data, signature: [...] }
  let broadcastTx
  if (typeof signedTx === 'string') {
    // Raw signature hex string — combine with original unsigned tx
    broadcastTx = { ...unsignedTx, signature: [signedTx] }
  } else if (signedTx && typeof signedTx === 'object') {
    const rawSig = signedTx.signature
    const hasSig = Array.isArray(rawSig) ? rawSig.length > 0 : (typeof rawSig === 'string' && rawSig.length > 0)
    const sigArr = Array.isArray(rawSig) ? rawSig : (rawSig ? [rawSig] : [])

    if (signedTx.txID && signedTx.raw_data && hasSig) {
      // Full signed tx returned — use it directly
      broadcastTx = { ...signedTx, signature: sigArr }
    } else if (hasSig) {
      // Only signature field present — merge with original unsigned tx for required fields
      broadcastTx = { ...unsignedTx, signature: sigArr }
    } else {
      // Unknown shape — merge everything and let TronGrid report the error
      broadcastTx = { ...unsignedTx, ...signedTx }
    }
  } else {
    throw new Error('Unexpected signing result from wallet. Please try again.')
  }

  // Step 3: broadcast the signed transaction
  const broadcastRes = await fetch(`${TRONGRID_URL}/wallet/broadcasttransaction`, {
    method: 'POST',
    headers,
    body: JSON.stringify(broadcastTx),
  })

  const broadcastResult = await broadcastRes.json()
  if (!broadcastResult.result) {
    // TronGrid hex-encodes error messages — decode them
    let errMsg = broadcastResult.message || broadcastResult.Error || ''
    if (errMsg && /^[0-9a-fA-F]{8,}$/.test(errMsg)) {
      try { errMsg = Buffer.from(errMsg, 'hex').toString('utf8') } catch {}
    }
    throw new Error(errMsg || `Broadcast failed (${broadcastResult.code || 'unknown error'})`)
  }

  return broadcastResult.txid || broadcastTx.txID
}

/**
 * Checks if spenderAddress has unlimited approval for tokenSymbol from walletAddress.
 * If not, sends an approve(spender, uint256.max) transaction first.
 * Returns true if a new approval transaction was sent, false if already approved.
 */
export async function ensureUnlimitedApproval(tokenSymbol, spenderAddress, walletAddress) {
  const tronWeb = getTronWeb()
  if (!tronWeb || !tronWeb.ready) throw new Error('Wallet not connected')

  const contract = await tronWeb.contract(TRC20_ABI, CONTRACTS[tokenSymbol])
  const raw = await contract.allowance(walletAddress, spenderAddress).call()
  const current = BigInt(raw.toString())

  if (current >= UNLIMITED_THRESHOLD) return false

  const toastId = toast.loading(`Approving unlimited ${tokenSymbol}...`)
  try {
    await contract.approve(spenderAddress, UINT256_MAX).send({
      feeLimit: 50_000_000,
      callValue: 0,
    })
    toast.success(`Unlimited ${tokenSymbol} approved!`, { id: toastId })
    return true
  } catch (err) {
    toast.dismiss(toastId)
    throw err
  }
}

export async function getSwapQuote(fromSymbol, toSymbol, amountIn, slippage = 2) {
  if (!amountIn || Number(amountIn) <= 0) return null

  const tronWeb = getTronWeb()
  const fromDecimals = TOKEN_DECIMALS[fromSymbol] ?? 6
  const toDecimals = TOKEN_DECIMALS[toSymbol] ?? 6

  const amountInBig = BigInt(Math.floor(Number(amountIn) * Math.pow(10, fromDecimals))).toString()
  const path = [CONTRACTS[fromSymbol], CONTRACTS[toSymbol]]

  try {
    const router = await tronWeb.contract(SUNSWAP_V2_ABI, CONTRACTS.SUNSWAP_V2_ROUTER)
    const amounts = await router.getAmountsOut(amountInBig, path).call()
    const amountOut = Number(amounts[1].toString()) / Math.pow(10, toDecimals)
    const minOut = amountOut * (1 - slippage / 100)

    return {
      amountOut: amountOut.toFixed(6),
      minOut: minOut.toFixed(6),
      rate: (amountOut / Number(amountIn)).toFixed(6),
      priceImpact: '< 0.1',
    }
  } catch (err) {
    console.error('Swap quote error:', err)
    return null
  }
}

export async function executeSwap(fromSymbol, toSymbol, amountIn, minOut, walletAddress) {
  const tronWeb = getTronWeb()

  if (!tronWeb || !tronWeb.ready) {
    throw new Error('Wallet not connected')
  }

  const fromDecimals = TOKEN_DECIMALS[fromSymbol] ?? 6
  const toDecimals = TOKEN_DECIMALS[toSymbol] ?? 6

  const amountInBig = BigInt(Math.floor(Number(amountIn) * Math.pow(10, fromDecimals))).toString()
  const minOutBig = BigInt(Math.floor(Number(minOut) * Math.pow(10, toDecimals))).toString()

  // Step 1: Ensure unlimited approval for SunSwap router
  await ensureUnlimitedApproval(fromSymbol, CONTRACTS.SUNSWAP_V2_ROUTER, walletAddress)

  // Step 2: Execute swap
  const router = await tronWeb.contract(SUNSWAP_V2_ABI, CONTRACTS.SUNSWAP_V2_ROUTER)
  const path = [CONTRACTS[fromSymbol], CONTRACTS[toSymbol]]
  const deadline = Math.floor(Date.now() / 1000) + 1200

  const txHash = await router.swapExactTokensForTokens(
    amountInBig,
    minOutBig,
    path,
    walletAddress,
    deadline
  ).send({ feeLimit: 100_000_000, callValue: 0 })

  return txHash
}

export async function sendToken(symbol, toAddress, amount, fromAddress) {
  const { connectionType } = useWalletStore.getState()

  // WalletConnect: bypass TronWeb (which fails on mobile Safari) and use TronGrid REST API
  if (connectionType === 'walletconnect') {
    return sendTokenWalletConnect(symbol, toAddress, amount, fromAddress)
  }

  // TronLink path
  const tronWeb = getTronWeb()

  if (!tronWeb || !tronWeb.ready) {
    throw new Error('Wallet not connected')
  }

  if (symbol === 'TRX') {
    const sunAmount = tronWeb.toSun(amount)
    const tx = await tronWeb.transactionBuilder.sendTrx(toAddress, sunAmount, fromAddress)
    const signed = await tronWeb.trx.sign(tx)
    const result = await tronWeb.trx.sendRawTransaction(signed)
    return result.txid
  }

  const decimals = TOKEN_DECIMALS[symbol] ?? 6
  const amountBig = BigInt(Math.floor(Number(amount) * Math.pow(10, decimals))).toString()
  const contract = await tronWeb.contract(TRC20_ABI, CONTRACTS[symbol])

  const txHash = await contract.transfer(toAddress, amountBig).send({
    feeLimit: 50_000_000,
    callValue: 0,
  })
  return txHash
}
