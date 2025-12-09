export function formatMoney(value: number, currency: string, locale: string = 'es-MX'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}