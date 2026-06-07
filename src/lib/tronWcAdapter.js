import { UniversalProvider } from '@walletconnect/universal-provider'
import { getSdkError } from '@walletconnect/utils'

const TRON_CHAIN_ID = 'tron:0x2b6653dc'

// optionalNamespaces must be used for TRON — requiredNamespaces triggers the AppKit
// wallet-selector modal which rejects TRON as an unsupported chain and blocks pairing.
// With optionalNamespaces, the wallet (Trust Wallet, OKX, etc.) can approve TRON methods
// on its own terms and the QR flow works without AppKit interference.
const TRON_NAMESPACE = {
  tron: {
    chains: [TRON_CHAIN_ID],
    methods: ['tron_signTransaction', 'tron_signMessage'],
    events: [],
  },
}

const CONNECT_PARAMS = {
  optionalNamespaces: TRON_NAMESPACE,
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

    // Verify the wallet actually approved tron_signTransaction.
    // With optionalNamespaces the wallet may approve the session without including
    // the TRON methods — detect that here and give a clear error immediately.
    const approvedMethods = Object.values(session.namespaces)
      .flatMap(ns => ns.methods ?? [])
    if (!approvedMethods.includes('tron_signTransaction')) {
      await this._provider.client.disconnect({
        topic: session.topic,
        reason: getSdkError('USER_DISCONNECTED'),
      }).catch(() => {})
      throw new Error(
        'Your wallet connected but does not support TRON signing. ' +
        'Please use Trust Wallet or OKX Wallet and make sure TRON is enabled.'
      )
    }

    this._session = session
    this._address = extractAddress(this._session)
    return this._address
  }

  async signTransaction(unsignedTx) {
    if (!this._session || !this._provider?.client) {
      throw new Error('WalletConnect session not found. Please reconnect your wallet.')
    }

    const chainId = extractChainId(this._session)

    // Different wallets require different params formats for tron_signTransaction:
    //   flat:   { address, transaction: tx }                — Trust Wallet, most mobile wallets
    //   nested: { address, transaction: { transaction: tx } } — some wallets declare tron_method_version='v2'
    // We try flat first (which Trust Wallet iOS/Android needs). If the wallet immediately
    // rejects with a format-related error, we retry with nested — no second user prompt
    // appears because the wallet rejected without showing a signing UI.
    const isV2 = this._session.sessionProperties?.tron_method_version === 'v2'

    const buildRequest = (nested) => ({
      chainId,
      topic: this._session.topic,
      request: {
        method: 'tron_signTransaction',
        params: nested
          ? { address: this._address, transaction: { transaction: unsignedTx } }
          : { address: this._address, transaction: unsignedTx },
      },
    })

    if (isV2) {
      const result = await this._provider.client.request(buildRequest(true))
      return result?.result ?? result
    }

    // Try flat first; fall back to nested if the wallet rejects immediately
    try {
      const result = await this._provider.client.request(buildRequest(false))
      return result?.result ?? result
    } catch (err) {
      const msg = String(err?.message ?? err)
      // Only retry on format-related wallet rejections — not on user cancellations or timeouts
      if (msg.includes('Failed to sign') || msg.includes('Unknown method') || msg.includes('5201')) {
        const result = await this._provider.client.request(buildRequest(true))
        return result?.result ?? result
      }
      throw err
    }
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
