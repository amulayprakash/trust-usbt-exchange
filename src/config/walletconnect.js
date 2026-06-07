import { WalletConnectWallet } from '@tronweb3/walletconnect-tron'

export function createWCWallet() {
  const projectId = import.meta.env.VITE_WC_PROJECT_ID
  if (!projectId) {
    throw new Error('VITE_WC_PROJECT_ID is not set in .env')
  }
  return new WalletConnectWallet({
    network: 'tron:0x2b6653dc',
    options: {
      relayUrl: 'wss://relay.walletconnect.com',
      projectId,
      metadata: {
        name: 'USBT Exchange',
        description: 'USBT TRC20 Exchange on Tron',
        url: window.location.origin,
        icons: [`${window.location.origin}/usbt-lolo.png`],
      },
    },
  })
}
