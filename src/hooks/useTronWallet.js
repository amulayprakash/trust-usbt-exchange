import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import useWalletStore from '@/store/useWalletStore'
import useAppStore from '@/store/useAppStore'
import { createWCWallet } from '@/config/walletconnect'
import { saveWallet } from '@/lib/supabaseDb'

// Singleton — reused across reconnections to avoid double WC Core initialization.
let wcWalletInstance = null

export function getWcWallet() {
  return wcWalletInstance
}

const TRON_CHAIN_ID = 'tron:0x2b6653dc'

// Use requiredNamespaces so wallets MUST include tron_signTransaction in the session.
// optionalNamespaces (what WalletConnectWallet.connectWithUri() uses internally) lets
// Trust Wallet connect without TRON methods, causing "Unknown method(s) requested" on sign.
const TRON_REQUIRED_NS = {
  tron: {
    chains: [TRON_CHAIN_ID],
    methods: ['tron_signTransaction', 'tron_signMessage'],
    events: [],
  },
}

function extractAddrFromSession(session) {
  return Object.values(session.namespaces)
    .flatMap(ns => ns.accounts)[0]
    ?.split(':')[2] ?? null
}

export default function useTronWallet() {
  const { setWallet, clearWallet, isConnected, address } = useWalletStore()
  const { closeModal } = useAppStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    // Auto-reconnect TronLink only if user was previously connected via TronLink
    const { connectionType } = useWalletStore.getState()
    if (
      connectionType === 'tronlink' &&
      typeof window !== 'undefined' &&
      window.tronWeb &&
      window.tronWeb.ready
    ) {
      const addr = window.tronWeb.defaultAddress?.base58
      if (addr && !isConnected) {
        setWallet(addr, 'tronlink')
        saveWallet(addr, 'tronlink')
      }
    }

    const handleMessage = (e) => {
      const action = e.data?.message?.action
      if (action === 'setAccount') {
        const newAddr = e.data.message.data?.address
        if (newAddr) {
          setWallet(newAddr, 'tronlink')
          saveWallet(newAddr, 'tronlink')
          queryClient.invalidateQueries({ queryKey: ['balances'] })
        } else {
          clearWallet()
        }
      }
      if (action === 'setNode') {
        queryClient.invalidateQueries({ queryKey: ['balances'] })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const connectTronLink = async () => {
    if (!window.tronWeb) {
      throw new Error('TronLink not detected. Please install TronLink extension.')
    }
    const result = await window.tronWeb.request({ method: 'tron_requestAccounts' })
    if (result?.code === 4001) throw new Error('Connection rejected by user.')
    const addr = window.tronWeb.defaultAddress?.base58
    if (!addr) throw new Error('Could not retrieve wallet address.')
    setWallet(addr, 'tronlink')
    saveWallet(addr, 'tronlink')
    closeModal('walletConnect')
    return addr
  }

  const connectWalletConnect = async (onUri) => {
    if (!wcWalletInstance) {
      wcWalletInstance = createWCWallet()
    }
    const wcWallet = wcWalletInstance

    // Get the UniversalProvider via the adapter — reuses the already-initialized
    // instance instead of calling UniversalProvider.init() again (no double-init).
    const provider = await wcWallet.getProvider()
    const client = provider.client

    // Restore an existing acknowledged session if it already has TRON signing approved
    const existing = client
      .find({ requiredNamespaces: TRON_REQUIRED_NS })
      .filter(s => s.acknowledged)

    if (existing.length > 0) {
      const session = existing[existing.length - 1]
      wcWallet._session = session
      wcWallet._client = client
      const addr = extractAddrFromSession(session)
      if (addr) {
        wcWallet.address = addr
        setWallet(addr, 'walletconnect')
        saveWallet(addr, 'walletconnect')
        closeModal('walletConnect')
        return addr
      }
    }

    // New pairing — requiredNamespaces forces the wallet to include tron_signTransaction.
    return new Promise((resolve, reject) => {
      provider.once('display_uri', (uri) => { if (onUri) onUri(uri) })

      provider.connect({
        pairingTopic: undefined,
        requiredNamespaces: TRON_REQUIRED_NS,
      }).then((session) => {
        if (!session) {
          reject(new Error('WalletConnect session was not established'))
          return
        }

        // Store session on the adapter so signViaWalletConnect() can use _session/_client
        wcWallet._session = session
        wcWallet._client = client

        const addr = extractAddrFromSession(session)
        if (addr) {
          wcWallet.address = addr
          setWallet(addr, 'walletconnect')
          saveWallet(addr, 'walletconnect')
          closeModal('walletConnect')
          resolve(addr)
        } else {
          reject(new Error('No TRON account found in WalletConnect session'))
        }
      }).catch(reject)
    })
  }

  const disconnect = async () => {
    if (wcWalletInstance) {
      try { await wcWalletInstance.disconnect() } catch (_) {}
      wcWalletInstance = null
    }
    clearWallet()
    queryClient.clear()
  }

  return { address, isConnected, connectTronLink, connectWalletConnect, disconnect }
}
