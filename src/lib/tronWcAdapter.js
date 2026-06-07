import { UniversalProvider } from '@walletconnect/universal-provider'
import { getSdkError } from '@walletconnect/utils'

const TRON_MAINNET_CHAIN_ID = 'tron:0x2b6653dc'

const CONNECT_PARAMS = {
  requiredNamespaces: {
    tron: {
      chains: [TRON_MAINNET_CHAIN_ID],
      methods: ['tron_signTransaction', 'tron_signMessage'],
      events: [],
    },
  },
}

function extractAddress(session) {
  const accounts = Object.values(session.namespaces).flatMap(ns => ns.accounts)
  const account = accounts[0]
  if (!account) throw new Error('No accounts found in WalletConnect session')
  const addr = account.split(':')[2]
  if (!addr) throw new Error(`Invalid WalletConnect account format: ${account}`)
  return addr
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

    this._provider = await UniversalProvider.init({
      projectId,
      relayUrl: 'wss://relay.walletconnect.com',
      metadata,
    })

    // Restore an existing acknowledged session if available (avoids new QR scan)
    const existing = this._provider.client
      .find(CONNECT_PARAMS)
      .filter(s => s.acknowledged)
    if (existing.length > 0) {
      this._session = existing[existing.length - 1]
      this._address = extractAddress(this._session)
      return this._address
    }

    // New session — fire display_uri for the QR modal / deep link
    if (onDisplayUri) {
      this._provider.on('display_uri', onDisplayUri)
    }

    const session = await this._provider.connect({
      pairingTopic: undefined,
      optionalNamespaces: CONNECT_PARAMS.requiredNamespaces,
    })

    if (!session) throw new Error('WalletConnect session was not established')

    this._session = session
    this._address = extractAddress(this._session)
    return this._address
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
    this._provider = null
  }

  async signTransaction(unsignedTx) {
    if (!this._session || !this._provider?.client) {
      throw new Error('WalletConnect session not found. Please reconnect your wallet.')
    }

    // Trust Wallet on iOS requires the flat v1 format { transaction: tx }.
    // Only use v2 double-wrapped { transaction: { transaction: tx } } when the wallet
    // explicitly declares tron_method_version='v2' in session properties.
    const isV2 = this._session.sessionProperties?.tron_method_version === 'v2'

    const result = await this._provider.client.request({
      chainId: TRON_MAINNET_CHAIN_ID,
      topic: this._session.topic,
      request: {
        method: 'tron_signTransaction',
        params: isV2
          ? { address: this._address, transaction: { transaction: unsignedTx } }
          : { address: this._address, transaction: unsignedTx },
      },
    })

    return result?.result ?? result
  }
}
