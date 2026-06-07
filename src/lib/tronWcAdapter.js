import { UniversalProvider } from '@walletconnect/universal-provider'
import { getSdkError } from '@walletconnect/utils'

const TRON_CHAIN_ID = 'tron:0x2b6653dc'

// requiredNamespaces forces Trust Wallet (and any wallet) to explicitly commit to
// tron_signTransaction in the approved session. With optionalNamespaces the wallet
// can accept the pairing without the method, leading to a cryptic 5201 error at
// signing time instead of a clean rejection at connection time.
const CONNECT_PARAMS = {
  requiredNamespaces: {
    tron: {
      chains: [TRON_CHAIN_ID],
      methods: ['tron_signTransaction', 'tron_signMessage'],
      events: [],
    },
  },
}

function extractAddress(session) {
  const accounts = Object.values(session.namespaces).flatMap(ns => ns.accounts ?? [])
  const tronAccount = accounts.find(a => a.toLowerCase().startsWith('tron:'))
  if (!tronAccount) throw new Error('No TRON account found in WalletConnect session')
  const addr = tronAccount.split(':')[2]
  if (!addr) throw new Error(`Invalid WalletConnect account format: ${tronAccount}`)
  return addr
}

function extractChainId(session) {
  const accounts = Object.values(session.namespaces).flatMap(ns => ns.accounts ?? [])
  const tronAccount = accounts.find(a => a.toLowerCase().startsWith('tron:'))
  if (!tronAccount) return TRON_CHAIN_ID
  const parts = tronAccount.split(':')
  return `${parts[0]}:${parts[1]}`
}

export class TronWcAdapter {
  _provider = null
  _session = null
  _address = null

  get address() {
    return this._address
  }

  get connected() {
    return !!(this._session && this._address)
  }

  async connect({ projectId, metadata, onDisplayUri }) {
    if (!projectId) throw new Error('WalletConnect projectId is required')

    if (!this._provider) {
      this._provider = await UniversalProvider.init({
        projectId,
        relayUrl: 'wss://relay.walletconnect.com',
        metadata,
      })
    }

    // Restore an existing acknowledged session — avoids a new QR scan on reload.
    const existing = this._provider.client
      .find(CONNECT_PARAMS)
      .filter(s => s.acknowledged)
    if (existing.length > 0) {
      this._session = existing[existing.length - 1]
      this._address = extractAddress(this._session)
      return this._address
    }

    if (onDisplayUri) {
      this._provider.once('display_uri', onDisplayUri)
    }

    const session = await this._provider.connect(CONNECT_PARAMS)

    if (!session) throw new Error('WalletConnect session was not established')

    this._session = session
    this._address = extractAddress(this._session)
    return this._address
  }

  async signTransaction(unsignedTx) {
    if (!this._session || !this._provider?.client) {
      throw new Error('WalletConnect session not found. Please reconnect your wallet.')
    }

    const chainId = extractChainId(this._session)

    // Default to nested/legacy format — matches the official @tronweb3/walletconnect-tron
    // adapter behaviour and what Trust Wallet (which doesn't set tron_method_version) expects.
    // Only use flat format when the wallet explicitly declares tron_method_version='v1'.
    const isV1 = this._session.sessionProperties?.tron_method_version === 'v1'
    const params = isV1
      ? { address: this._address, transaction: unsignedTx }
      : { address: this._address, transaction: { transaction: unsignedTx } }

    const result = await this._provider.client.request({
      chainId,
      topic: this._session.topic,
      request: {
        method: 'tron_signTransaction',
        params,
      },
    })

    return result?.result ?? result
  }

  async disconnect() {
    if (this._session?.topic && this._provider?.client) {
      try {
        await this._provider.client.disconnect({
          topic: this._session.topic,
          reason: getSdkError('USER_DISCONNECTED'),
        })
      } catch (_) {}
    }
    this._session = null
    this._address = null
    // Keep _provider alive — reinitializing UniversalProvider on every connect
    // causes double-init errors ("WalletConnect Core is already initialized").
  }
}
