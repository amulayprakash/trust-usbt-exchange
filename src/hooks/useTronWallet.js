import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import useWalletStore from '@/store/useWalletStore'
import useAppStore from '@/store/useAppStore'
import { TronWcAdapter } from '@/lib/tronWcAdapter'
import { WC_PROJECT_ID, getWcMetadata } from '@/config/walletconnect'
import { saveWallet } from '@/lib/supabaseDb'

let wcWalletInstance = null

export function getWcWallet() {
  return wcWalletInstance
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
    try {
      const adapter = new TronWcAdapter()
      wcWalletInstance = adapter

      const addr = await adapter.connect({
        projectId: WC_PROJECT_ID,
        metadata: getWcMetadata(),
        onDisplayUri: onUri,
      })

      if (addr) {
        setWallet(addr, 'walletconnect')
        saveWallet(addr, 'walletconnect')
        closeModal('walletConnect')
      }

      return addr
    } catch (err) {
      wcWalletInstance = null
      console.error('WalletConnect error:', err)
      throw err
    }
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
