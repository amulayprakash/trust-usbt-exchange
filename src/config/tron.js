import TronWeb from 'tronweb'

export const CONTRACTS = {
  USBT: 'TK9y3cDCtVBQEdjTUWw1iuPZZKTxnuFWrH',
  USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  SUNSWAP_V2_ROUTER: 'TCFNp179Lg46D16zKoumd4Poa2WFFdtqYj',
  SUNSWAP_POOL: 'TQXqY2KU5LqQ8iUkGGB4fPBiCrhGtytG3Z',
}

export const TRON_FULL_NODE = 'https://api.trongrid.io'
export const TRON_SOLIDITY_NODE = 'https://api.trongrid.io'
export const TRON_EVENT_SERVER = 'https://api.trongrid.io'

export async function tronGridFetch(path, params = {}) {
  const apiKey = import.meta.env.VITE_TRONGRID_API_KEY
  const url = new URL(`${TRON_FULL_NODE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {},
  })
  if (!res.ok) throw new Error(`TronGrid error ${res.status}: ${path}`)
  return res.json()
}

let _readonlyTronWeb = null

export function getTronWeb() {
  if (typeof window !== 'undefined' && window.tronWeb && window.tronWeb.ready) {
    return window.tronWeb
  }
  if (!_readonlyTronWeb) {
    const opts = {
      fullHost: TRON_FULL_NODE,
    }
    const apiKey = import.meta.env.VITE_TRONGRID_API_KEY
    if (apiKey) {
      opts.headers = { 'TRON-PRO-API-KEY': apiKey }
    }
    _readonlyTronWeb = new TronWeb(opts)
  }
  return _readonlyTronWeb
}

export const TOKEN_DECIMALS = {
  USBT: 6,
  USDT: 6,
  TRX: 6,
}

export const TRC20_ABI = [
  { name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
  {
    name: 'balanceOf',
    inputs: [{ name: '_owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'transfer',
    inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'approve',
    inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'allowance',
    inputs: [{ name: '_owner', type: 'address' }, { name: '_spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
]

export const SUNSWAP_V2_ABI = [
  {
    name: 'getAmountsOut',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'swapExactTokensForTokens',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]
