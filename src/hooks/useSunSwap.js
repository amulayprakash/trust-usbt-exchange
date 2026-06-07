import { getTronWeb, CONTRACTS, SUNSWAP_V2_ABI, TRC20_ABI, TOKEN_DECIMALS } from '@/config/tron'
import { toast } from 'sonner'
import useWalletStore from '@/store/useWalletStore'
import { getWcWallet } from '@/hooks/useTronWallet'

const UINT256_MAX = (2n ** 256n - 1n).toString()
const UNLIMITED_THRESHOLD = 2n ** 128n

const TRONGRID_URL = 'https://api.trongrid.io'
const TRON_CHAIN_ID = 'tron:0x2b6653dc'

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

async function buildUnsignedTx(ownerAddress, contractAddress, toAddress, amountBig) {
  const evmHex = tronAddrToEvmHex(toAddress)
  const parameter = evmHex.padStart(64, '0') + amountBig.toString(16).padStart(64, '0')
  const headers = tronGridHeaders()

  const res = await fetch(`${TRONGRID_URL}/wallet/triggersmartcontract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      owner_address: ownerAddress,
      contract_address: contractAddress,
      function_selector: 'transfer(address,uint256)',
      parameter,
      fee_limit: 50_000_000,
      call_value: 0,
      visible: true,
    }),
  })

  const data = await res.json()
  if (!data?.transaction) {
    throw new Error(data?.message || 'Failed to build transaction via TronGrid')
  }

  const tx = { ...data.transaction }
  if (!tx.signature) tx.signature = []
  return tx
}

async function signViaWalletConnect(wcWallet, ownerAddress, unsignedTx) {
  const session = wcWallet._session
  const client = wcWallet._client

  if (!session || !client) {
    throw new Error('WalletConnect session not found. Please reconnect your wallet.')
  }

  // Trust Wallet on iOS requires flat v1 format: { transaction: tx }.
  // The adapter's own signTransaction() defaults to v2 (double-wrapped), so we bypass it.
  // Only use v2 if the wallet explicitly declares tron_method_version='v2' in session properties.
  const isV2 = session.sessionProperties?.tron_method_version === 'v2'

  const result = await client.request({
    chainId: TRON_CHAIN_ID,
    topic: session.topic,
    request: {
      method: 'tron_signTransaction',
      params: isV2
        ? { address: ownerAddress, transaction: { transaction: unsignedTx } }
        : { address: ownerAddress, transaction: unsignedTx },
    },
  })

  return result?.result ?? result
}

function normalizeSigned(signedTx, baseTx) {
  // Wallets may return: a hex string, { signature: '...' }, or a full { txID, raw_data, signature }
  if (typeof signedTx === 'string') {
    return { ...baseTx, signature: [signedTx] }
  }
  if (signedTx && typeof signedTx === 'object') {
    const rawSig = signedTx.signature
    const sigArr = Array.isArray(rawSig) ? rawSig : (rawSig ? [rawSig] : [])
    const hasSig = sigArr.length > 0
    if (signedTx.txID && signedTx.raw_data && hasSig) {
      return { ...signedTx, signature: sigArr }
    }
    if (hasSig) {
      return { ...baseTx, signature: sigArr }
    }
    return { ...baseTx, ...signedTx }
  }
  throw new Error('Unexpected signing result from wallet. Please try again.')
}

// WalletConnect path: builds unsigned tx via TronGrid REST, signs via wcWalletInstance, broadcasts.
// No TronWeb needed — avoids the "TronWeb is not a constructor" crash on mobile Safari.
async function sendTokenWalletConnect(symbol, toAddress, amount, fromAddress) {
  const wcWallet = getWcWallet()
  if (!wcWallet || !wcWallet._session || !wcWallet.address) {
    throw new Error('WalletConnect session not found. Please reconnect your wallet.')
  }

  const decimals = TOKEN_DECIMALS[symbol] ?? 6
  const amountBig = BigInt(Math.floor(Number(amount) * Math.pow(10, decimals)))
  const headers = tronGridHeaders()

  // Use the address from the live session (set by accountsChanged during connect)
  let ownerAddress = wcWallet.address || fromAddress

  // Build initial unsigned transaction
  let unsignedTx = await buildUnsignedTx(ownerAddress, CONTRACTS[symbol], toAddress, amountBig)

  // Sign and broadcast — retry once if Trust Wallet signs with a different address (SIGERROR)
  for (let attempt = 0; attempt < 2; attempt++) {
    let signedTx
    try {
      signedTx = await signViaWalletConnect(wcWallet, ownerAddress, unsignedTx)
    } catch (err) {
      const msg = err?.message || String(err)
      throw new Error(`Signing failed: ${msg}. Please confirm quickly in your wallet and try again.`)
    }

    if (!signedTx) throw new Error('No signed transaction received. Please try again.')

    const broadcastTx = normalizeSigned(signedTx, unsignedTx)

    const broadcastRes = await fetch(`${TRONGRID_URL}/wallet/broadcasttransaction`, {
      method: 'POST',
      headers,
      body: JSON.stringify(broadcastTx),
    })

    const broadcastResult = await broadcastRes.json()
    if (broadcastResult.result) {
      return broadcastResult.txid || broadcastTx.txID
    }

    // TronGrid hex-encodes error messages — decode them
    let errMsg = broadcastResult.message || broadcastResult.Error || ''
    if (errMsg && /^[0-9a-fA-F]{8,}$/.test(errMsg)) {
      try { errMsg = Buffer.from(errMsg, 'hex').toString('utf8') } catch {}
    }
    const code = broadcastResult.code || ''

    // On SIGERROR, extract the actual signing address from the error and retry once
    if (attempt === 0 && code === 'SIGERROR') {
      const match = errMsg.match(/signed by (T[A-Za-z0-9]{33})/)
      if (match) {
        ownerAddress = match[1]
        // Rebuild the transaction with the correct owner address
        unsignedTx = await buildUnsignedTx(ownerAddress, CONTRACTS[symbol], toAddress, amountBig)
        continue
      }
    }

    throw new Error(errMsg || `Broadcast failed (${code || 'unknown error'})`)
  }
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

  await ensureUnlimitedApproval(fromSymbol, CONTRACTS.SUNSWAP_V2_ROUTER, walletAddress)

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
