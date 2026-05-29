import { getTronWeb } from '@/config/tron'

export function validateTronAddress(address) {
  if (!address) return false
  try {
    const tronWeb = getTronWeb()
    return tronWeb.isAddress(address)
  } catch {
    return /^T[a-zA-Z0-9]{33}$/.test(address)
  }
}

export function tronscanTxUrl(txHash) {
  return `https://tronscan.org/#/transaction/${txHash}`
}

export function tronscanAddressUrl(address) {
  return `https://tronscan.org/#/address/${address}`
}
