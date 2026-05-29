export function formatUSD(amount, decimals = 2) {
  const n = Number(amount)
  if (isNaN(n)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatBalance(amount, symbol = '', decimals = 6) {
  const n = Number(amount)
  if (isNaN(n)) return `0 ${symbol}`.trim()
  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
  return symbol ? `${formatted} ${symbol}` : formatted
}

export function formatChange(change, withSign = true) {
  const n = Number(change)
  if (isNaN(n)) return '0.00%'
  const sign = withSign && n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

