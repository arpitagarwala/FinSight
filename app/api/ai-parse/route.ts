import { NextRequest, NextResponse } from 'next/server'

// Round-robin counter for Gemini key rotation
let geminiKeyIndex = 0

function getNextGeminiKey(): string | null {
  const keys = (process.env.GEMINI_API_KEYS || '').split(',').filter(Boolean)
  if (keys.length === 0) return null
  const key = keys[geminiKeyIndex % keys.length]
  geminiKeyIndex = (geminiKeyIndex + 1) % keys.length
  return key
}

const SYSTEM_PROMPT = `You are a financial transaction parser for an Indian personal finance app. Given a natural language sentence describing a financial transaction, extract the following fields and return ONLY valid JSON (no markdown, no explanation):

{
  "amount": <number>,
  "type": "income" or "expense",
  "category": "<one of: Food & Dining, Transport, Shopping, Entertainment, Health & Medical, Education, Housing & Rent, Utilities, Subscriptions, Travel, Personal Care, Investments, Insurance, Loans & EMI, Gifts & Donations, Salary, Freelance, Business, Dividends, Side Income, Other>",
  "description": "<clean merchant/person name>",
  "date": "<YYYY-MM-DD format, use today if not mentioned>"
}

RULES:
1. "spent", "paid", "bought" = expense. "received", "got", "earned", "salary", "credited" = income.
2. If user says "yesterday", compute the correct date. If "last week", estimate 7 days ago. Default to today.
3. Keep description clean and in Title Case (e.g., "Starbucks", "Amazon", "Zomato").
4. For categories, pick the BEST match. "uber" or "ola" = Transport. "netflix" = Subscriptions. "rent" = Housing & Rent.
5. Return ONLY the JSON object. No extra text.`

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const userPrompt = `Today is ${today}. Yesterday was ${yesterday}. Parse this: "${text}"`

    // Strategy: Try Gemini keys first (rotating), then Groq, then OpenRouter
    let result = null

    // 1. Try Gemini (rotate through all keys if needed)
    const allGeminiKeys = (process.env.GEMINI_API_KEYS || '').split(',').filter(Boolean)
    const startIndex = geminiKeyIndex
    
    for (let attempt = 0; attempt < allGeminiKeys.length; attempt++) {
      const key = getNextGeminiKey()
      if (!key) break
      
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
              generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
            })
          }
        )
        
        if (res.ok) {
          const data = await res.json()
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (content) {
            result = JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim())
            break
          }
        }
        // If 429 (rate limit), try next key
        if (res.status !== 429) break
      } catch (e) {
        continue // Try next key
      }
    }

    // 2. Fallback to Groq
    if (!result) {
      const groqKey = process.env.GROQ_API_KEY
      if (groqKey) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.1,
              response_format: { type: 'json_object' }
            })
          })
          if (res.ok) {
            const data = await res.json()
            const content = data.choices?.[0]?.message?.content
            if (content) result = JSON.parse(content)
          }
        } catch (e) { /* fall through */ }
      }
    }

    // 3. Fallback to OpenRouter
    if (!result) {
      const orKey = process.env.OPENROUTER_API_KEY
      if (orKey) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${orKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.1,
              response_format: { type: 'json_object' }
            })
          })
          if (res.ok) {
            const data = await res.json()
            const content = data.choices?.[0]?.message?.content
            if (content) result = JSON.parse(content)
          }
        } catch (e) { /* fall through */ }
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'All AI providers failed' }, { status: 503 })
    }

    // Validate and sanitize the result
    const parsed = {
      amount: Math.abs(Number(result.amount) || 0),
      type: result.type === 'income' ? 'income' : 'expense',
      category: result.category || 'Other',
      description: result.description || '',
      date: result.date || today
    }

    return NextResponse.json({ parsed })
  } catch (err: any) {
    console.error('AI Parse error:', err)
    return NextResponse.json({ error: err.message || 'Parse failed' }, { status: 500 })
  }
}
