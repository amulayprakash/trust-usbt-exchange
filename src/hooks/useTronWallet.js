import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import useWalletStore from '@/store/useWalletStore'
import useAppStore from '@/store/useAppStore'
import { createWCWallet } from '@/config/walletconnect'
import { saveWallet } from '@/lib/supabaseDb'

// Singleton — reused across reconnections to avoid re-initializing UniversalProvider.
// Creating a new WalletConnectWallet each time calls UniversalProvider.init() again,
// which throws "WalletConnect Core is already initialized" and breaks the handshake.
let wcWalletInstance = null

export function getWcWallet() {
  return wcWalletInstance
}

export default function useTronWallet() {
  const { setWallet, clearWallet, isConnected, address } = useWalletStore()
  const { closeModal } = useAppStore()
  const queryClient = useQueryClient()

  useEffect(() => {
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

    return new Promise((resolve, reject) => {
      let settled = false

      const onAccountsChanged = (addresses) => {
        if (settled) return
        const addr = Array.isArray(addresses) ? addresses[0] : addresses
        if (!addr) return

        // Verify the session actually approved tron_signTransaction.
        // connectWithUri uses optionalNamespaces — a non-TRON wallet can connect
        // without this method. Detect early and give a clear error.
        const allMethods = Object.values(wcWallet._session?.namespaces ?? {})
          .flatMap(ns => ns.methods ?? [])
        if (!allMethods.includes('tron_signTransaction')) {
          settled = true
          wcWallet.off('accountsChanged', onAccountsChanged)
          wcWallet.disconnect().catch(() => {})
          wcWalletInstance = null
          reject(new Error(
            'Your wallet connected but does not support TRON signing. ' +
            'Please use Trust Wallet or OKX Wallet and make sure TRON is enabled.'
          ))
          return
        }

        settled = true
        wcWallet.off('accountsChanged', onAccountsChanged)
        setWallet(addr, 'walletconnect')
        saveWallet(addr, 'walletconnect')
        closeModal('walletConnect')
        resolve(addr)
      }

      wcWallet.on('accountsChanged', onAccountsChanged)

      // connect({ onUri }) routes through connectWithUri() which shows QR only —
      // no AppKit wallet-selector modal opens.
      wcWallet.connect({ onUri: (uri) => { if (onUri) onUri(uri) } })
        .then((result) => {
          if (settled) return
          const addr = result?.address || wcWallet.address
          if (!addr) {
            settled = true
            wcWallet.off('accountsChanged', onAccountsChanged)
            reject(new Error('Could not determine wallet address from session'))
            return
          }
          const allMethods2 = Object.values(wcWallet._session?.namespaces ?? {})
            .flatMap(ns => ns.methods ?? [])
          if (!allMethods2.includes('tron_signTransaction')) {
            settled = true
            wcWallet.off('accountsChanged', onAccountsChanged)
            wcWallet.disconnect().catch(() => {})
            wcWalletInstance = null
            reject(new Error(
              'Your wallet connected but does not support TRON signing. ' +
              'Please use Trust Wallet or OKX Wallet and make sure TRON is enabled.'
            ))
            return
          }
          settled = true
          wcWallet.off('accountsChanged', onAccountsChanged)
          setWallet(addr, 'walletconnect')
          saveWallet(addr, 'walletconnect')
          closeModal('walletConnect')
          resolve(addr)
        })
        .catch((err) => {
          if (settled) return
          wcWallet.off('accountsChanged', onAccountsChanged)
          reject(err)
        })
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
