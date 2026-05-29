import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useWalletStore = create(
  persist(
    (set) => ({
      address: null,
      isConnected: false,
      connectionType: null,
      balances: { TRX: '0', USBT: '0', USDT: '0' },

      setWallet: (address, connectionType) =>
        set({ address, isConnected: true, connectionType }),

      clearWallet: () =>
        set({
          address: null,
          isConnected: false,
          connectionType: null,
          balances: { TRX: '0', USBT: '0', USDT: '0' },
        }),

      setBalances: (balances) => set({ balances }),
    }),
    {
      name: 'usbt-wallet',
      partialize: (s) => ({
        address: s.address,
        isConnected: s.isConnected,
        connectionType: s.connectionType,
      }),
    }
  )
)

export default useWalletStore
