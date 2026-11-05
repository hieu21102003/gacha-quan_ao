export function formatPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) return 'Price unknown'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}
