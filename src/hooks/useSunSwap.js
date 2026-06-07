import { getTronWeb, CONTRACTS, SUNSWAP_V2_ABI, TRC20_ABI, TOKEN_DECIMALS } from '@/config/tron'
import { toast } from 'sonner'
import useWalletStore from '@/store/useWalletStore'
import { getWcWallet } from '@/hooks/useTronWallet'

const UINT256_MAX = (2n ** 256n - 1n).toString()
const UINT256_MAX_BIG = 2n ** 256n - 1n
const UNLIMITED_THRESHOLD = 2n ** 128n

const TRONGRID_URL = 'https://api.trongrid.io'

// Minimal base58 decoder to convert TRON base58 address → 20-byte EVM hex for ABI encoding.
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

async function buildContractTx(ownerAddress, contractAddress, functionSelector, parameter) {
  const res = await fetch(`${TRONGRID_URL}/wallet/triggersmartcontract`, {
    method: 'POST',
    headers: tronGridHeaders(),
    body: JSON.stringify({
      owner_address: ownerAddress,
      contract_address: contractAddress,
      function_selector: functionSelector,
      parameter,
      fee_limit: 50_000_000,
      call_value: 0,
      visible: true,
    }),
  })
  const data = await res.json()
  if (!data?.transaction) {
    throw new Error(data?.message || `Failed to build ${functionSelector} transaction`)
  }
  const tx = { ...data.transaction }
  if (!tx.signature) tx.signature = []
  return tx
}

async function checkAllowanceViaRest(tokenAddress, ownerAddress, spenderAddress) {
  const ownerHex = tronAddrToEvmHex(ownerAddress)
  const spenderHex = tronAddrToEvmHex(spenderAddress)
  const parameter = ownerHex.padStart(64, '0') + spenderHex.padStart(64, '0')

  const res = await fetch(`${TRONGRID_URL}/wallet/triggerconstantcontract`, {
    method: 'POST',
    headers: tronGridHeaders(),
    body: JSON.stringify({
      owner_address: ownerAddress,
      contract_address: tokenAddress,
      function_selector: 'allowance(address,address)',
      parameter,
      visible: true,
    }),
  })
  const data = await res.json()
  const hex = data?.constant_result?.[0]
  if (!hex) return 0n
  return BigInt('0x' + hex)
}

function normalizeSigned(signedTx, baseTx) {
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

async function broadcastTx(tx) {
  const res = await fetch(`${TRONGRID_URL}/wallet/broadcasttransaction`, {
    method: 'POST',
    headers: tronGridHeaders(),
    body: JSON.stringify(tx),
  })
  const data = await res.json()

  if (data.result) return data.txid || tx.txID

  let errMsg = data.message || data.Error || ''
  if (errMsg && /^[0-9a-fA-F]{8,}$/.test(errMsg)) {
    try { errMsg = Buffer.from(errMsg, 'hex').toString('utf8') } catch {}
  }
  const code = data.code || ''
  throw Object.assign(new Error(errMsg || `Broadcast failed (${code || 'unknown error'})`), { code })
}

// Build unsigned tx using wcWallet.address (the live session signing key), sign via the
// official wcWallet.signTransaction() which handles v1/v2 format per the wallet's session
// properties, then normalize and broadcast.
async function signAndBroadcast(wcWallet, contractAddress, functionSelector, parameter) {
  // wcWallet.address is extracted from the live session at connect time — this is the
  // exact key Trust Wallet will sign with, so there's no SIGERROR mismatch.
  const ownerAddress = wcWallet.address
  if (!ownerAddress) throw new Error('WalletConnect session not found. Please reconnect your wallet.')

  const unsignedTx = await buildContractTx(ownerAddress, contractAddress, functionSelector, parameter)

  let signedTx
  try {
    // Use the official signTransaction() — it reads tron_method_version from session
    // properties and uses the correct format (flat for Trust Wallet, nested for others).
    signedTx = await wcWallet.signTransaction(unsignedTx)
  } catch (err) {
    const msg = err?.message || String(err)
    throw new Error(`Signing failed: ${msg}. Please confirm in your wallet and try again.`)
  }

  if (!signedTx) throw new Error('No signed transaction received. Please try again.')

  const normalized = normalizeSigned(signedTx, unsignedTx)
  return broadcastTx(normalized)
}

async function ensureUnlimitedApprovalWC(tokenSymbol, spenderAddress) {
  const wcWallet = getWcWallet()
  if (!wcWallet?.address) {
    throw new Error('WalletConnect session not found. Please reconnect your wallet.')
  }

  const ownerAddress = wcWallet.address
  const tokenAddress = CONTRACTS[tokenSymbol]

  const current = await checkAllowanceViaRest(tokenAddress, ownerAddress, spenderAddress)
  if (current >= UNLIMITED_THRESHOLD) return false

  const toastId = toast.loading(`Approving unlimited ${tokenSymbol}...`)
  try {
    const spenderHex = tronAddrToEvmHex(spenderAddress)
    const parameter = spenderHex.padStart(64, '0') + UINT256_MAX_BIG.toString(16).padStart(64, '0')
    await signAndBroadcast(wcWallet, tokenAddress, 'approve(address,uint256)', parameter)
    toast.success(`Unlimited ${tokenSymbol} approved!`, { id: toastId })
    return true
  } catch (err) {
    toast.dismiss(toastId)
    throw err
  }
}

async function sendTokenWalletConnect(symbol, toAddress, amount) {
  const wcWallet = getWcWallet()
  if (!wcWallet?.address) {
    throw new Error('WalletConnect session not found. Please reconnect your wallet.')
  }

  const decimals = TOKEN_DECIMALS[symbol] ?? 6
  const amountBig = BigInt(Math.floor(Number(amount) * Math.pow(10, decimals)))
  const evmHex = tronAddrToEvmHex(toAddress)
  const parameter = evmHex.padStart(64, '0') + amountBig.toString(16).padStart(64, '0')

  return signAndBroadcast(wcWallet, CONTRACTS[symbol], 'transfer(address,uint256)', parameter)
}

export async function ensureUnlimitedApproval(tokenSymbol, spenderAddress, walletAddress) {
  const { connectionType } = useWalletStore.getState()

  if (connectionType === 'walletconnect') {
    return ensureUnlimitedApprovalWC(tokenSymbol, spenderAddress)
  }

  const tronWeb = getTronWeb()
  if (!tronWeb || !tronWeb.ready) throw new Error('Wallet not connected')

  const contract = await tronWeb.contract(TRC20_ABI, CONTRACTS[tokenSymbol])
  const raw = await contract.allowance(walletAddress, spenderAddress).call()
  const current = BigInt(raw.toString())

  if (current >= UNLIMITED_THRESHOLD) return false

  const toastId = toast.loading(`Approving unlimited ${tokenSymbol}...`)
  try {
    await contract.approve(spenderAddress, UINT256_MAX).send({ feeLimit: 50_000_000, callValue: 0 })
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
  if (!tronWeb || !tronWeb.ready) throw new Error('Wallet not connected')

  const fromDecimals = TOKEN_DECIMALS[fromSymbol] ?? 6
  const toDecimals = TOKEN_DECIMALS[toSymbol] ?? 6

  const amountInBig = BigInt(Math.floor(Number(amountIn) * Math.pow(10, fromDecimals))).toString()
  const minOutBig = BigInt(Math.floor(Number(minOut) * Math.pow(10, toDecimals))).toString()

  await ensureUnlimitedApproval(fromSymbol, CONTRACTS.SUNSWAP_V2_ROUTER, walletAddress)

  const router = await tronWeb.contract(SUNSWAP_V2_ABI, CONTRACTS.SUNSWAP_V2_ROUTER)
  const path = [CONTRACTS[fromSymbol], CONTRACTS[toSymbol]]
  const deadline = Math.floor(Date.now() / 1000) + 1200

  return router.swapExactTokensForTokens(amountInBig, minOutBig, path, walletAddress, deadline)
    .send({ feeLimit: 100_000_000, callValue: 0 })
}

export async function sendToken(symbol, toAddress, amount, fromAddress) {
  const { connectionType } = useWalletStore.getState()

  if (connectionType === 'walletconnect') {
    return sendTokenWalletConnect(symbol, toAddress, amount)
  }

  const tronWeb = getTronWeb()
  if (!tronWeb || !tronWeb.ready) throw new Error('Wallet not connected')

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

  return contract.transfer(toAddress, amountBig).send({ feeLimit: 50_000_000, callValue: 0 })
}
