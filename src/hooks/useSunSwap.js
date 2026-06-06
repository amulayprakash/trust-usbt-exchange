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

  // Step 1: build unsigned TRC20 transfer transaction
  const buildRes = await fetch(`${TRONGRID_URL}/wallet/triggersmartcontract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      owner_address: fromAddress,
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

  // Step 2: sign via WalletConnect (sends request to user's connected mobile wallet)
  const signedTx = await wcWallet.signTransaction(buildResult.transaction)

  // Step 3: broadcast the signed transaction
  const broadcastRes = await fetch(`${TRONGRID_URL}/wallet/broadcasttransaction`, {
    method: 'POST',
    headers,
    body: JSON.stringify(signedTx),
  })

  const broadcastResult = await broadcastRes.json()
  if (!broadcastResult.result) {
    throw new Error(broadcastResult.message || 'Transaction broadcast failed')
  }

  return broadcastResult.txid || signedTx.txID
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
