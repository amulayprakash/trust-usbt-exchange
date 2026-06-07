import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import useWalletStore from '@/store/useWalletStore'
import useAppStore from '@/store/useAppStore'
import { TronWcAdapter } from '@/lib/tronWcAdapter'
import { WC_PROJECT_ID, getWcMetadata } from '@/config/walletconnect'
import { saveWallet } from '@/lib/supabaseDb'

// Singleton — reused across reconnections to avoid re-initializing UniversalProvider.
// Creating a new TronWcAdapter each time calls UniversalProvider.init() again, which
// throws "WalletConnect Core is already initialized" and breaks the session handshake.
let wcAdapterInstance = null

export function getWcWallet() {
  return wcAdapterInstance
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
    if (!WC_PROJECT_ID) throw new Error('VITE_WC_PROJECT_ID is not set in .env')

    if (!wcAdapterInstance) {
      wcAdapterInstance = new TronWcAdapter()
    }

    const addr = await wcAdapterInstance.connect({
      projectId: WC_PROJECT_ID,
      metadata: getWcMetadata(),
      onDisplayUri: onUri,
    })

    setWallet(addr, 'walletconnect')
    saveWallet(addr, 'walletconnect')
    closeModal('walletConnect')
    return addr
  }

  const disconnect = async () => {
    if (wcAdapterInstance) {
      try { await wcAdapterInstance.disconnect() } catch (_) {}
      wcAdapterInstance = null
    }
    clearWallet()
    queryClient.clear()
  }

  return { address, isConnected, connectTronLink, connectWalletConnect, disconnect }
}
