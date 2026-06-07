export const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID

export function getWcMetadata() {
  return {
    name: 'USBT Exchange',
    description: 'USBT TRC20 Exchange on Tron',
    url: window.location.origin,
    icons: [`${window.location.origin}/usbt-lolo.png`],
  }
}
