import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const { prompt, messages, cacheKey } = await req.json()

    // Build messages array
    const chatMessages = messages || [
      { role: 'system', content: 'You are FinSight AI, an expert personal finance advisor for India. Give concise, actionable advice (₹, SIP, tax laws, etc.). CRITICAL INSTRUCTION: You MUST strictly refuse to answer any questions that are outside the domain of personal finance, investing, economy, or money management. If a user asks about programming, creative writing, health, or anything else, politely decline and steer the conversation back to finance. SECOND CRITICAL INSTRUCTION: DO NOT use any markdown formatting whatsoever. Do not use asterisks (* or **) for bolding or italics. Do not use dashes (-) for bullets. Output only clean, plain paragraph text. If you must iterate a list, use plain numbers (1. 2. 3.).' },
      { role: 'user', content: prompt }
    ]

    // Try Groq first
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      const groqRes = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: chatMessages, max_tokens: 512, temperature: 0.7 })
      })

      if (groqRes.ok) {
        const data = await groqRes.json()
        return NextResponse.json({ response: data.choices[0]?.message?.content || '' })
      }
    }

    // Fallback to Gemini
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: chatMessages.map((m: any) => `${m.role}: ${m.content}`).join('\n') }] }] })
        }
      )
      if (geminiRes.ok) {
        const data = await geminiRes.json()
        return NextResponse.json({ response: data.candidates?.[0]?.content?.parts?.[0]?.text || '' })
      }
    }

    return NextResponse.json({ response: '', error: 'No AI provider configured' }, { status: 503 })
  } catch (err) {
    console.error('AI API error:', err)
    return NextResponse.json({ response: '', error: 'Internal error' }, { status: 500 })
  }
}
