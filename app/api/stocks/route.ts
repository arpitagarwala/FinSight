import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbols = searchParams.get('symbols')
  if (!symbols) return NextResponse.json({})

  const prices: Record<string, { price: number; change: number }> = {}

  try {
    const symArr = symbols.split(',')
    const fetchPromises = symArr.map(async (sym) => {
      // Auto-append .NS for Indian stocks if no suffix is provided and it's not a crypto pair
      let querySym = sym
      if (!sym.includes('.') && !sym.includes('-')) {
        querySym = `${sym}.NS` // default to NSE
      }
      
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${querySym}`)
      if (res.ok) {
        const data = await res.json()
        const result = data.chart?.result?.[0]
        if (result && result.meta) {
          const price = result.meta.regularMarketPrice
          const prevClose = result.meta.previousClose || price
          const change = ((price - prevClose) / prevClose) * 100
          prices[sym] = { price, change }
        }
      }
    })
    await Promise.all(fetchPromises)
    return NextResponse.json(prices)
  } catch (error) {
    return NextResponse.json(prices)
  }
}
