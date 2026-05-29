import { create } from 'zustand'

const useAppStore = create((set) => ({
  slippage: 2,
  swapFromToken: 'USBT',
  swapToToken: 'USDT',
  modals: {
    walletConnect: false,
    tokenSelector: false,
    slippage: false,
    sendConfirm: false,
    swapConfirm: false,
  },

  setSlippage: (slippage) => set({ slippage }),
  setSwapPair: (from, to) => set({ swapFromToken: from, swapToToken: to }),

  openModal: (name) =>
    set((s) => ({ modals: { ...s.modals, [name]: true } })),

  closeModal: (name) =>
    set((s) => ({ modals: { ...s.modals, [name]: false } })),

  closeAllModals: () =>
    set({
      modals: {
        walletConnect: false,
        tokenSelector: false,
        slippage: false,
        sendConfirm: false,
        swapConfirm: false,
      },
    }),
}))

export default useAppStore
