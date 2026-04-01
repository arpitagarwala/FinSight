import { Transaction } from './parser';

function localClean(desc: string): string {
  return desc
    .replace(/\b(?:IMPS|UPI|NEFT|RTGS|NWD|CHG|ATM|TRANSFER|SETTLEMENT|PAYMENT)\b/gi, '')
    .replace(/[0-9]{8,}/g, '')
    .replace(/XX+/g, '')
    .replace(/\/[^ ]+/g, '')
    .replace(/@\w+/g, '')
    .replace(/\.RZP|\.RZP@\d+|\d+@\w+/gi, '') // Remove Indian payment tails
    .replace(/-+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || desc;
}

export async function distillTransactions(transactions: Transaction[], openRouterKey: string): Promise<Transaction[]> {
  const rawDescriptions = [...new Set(transactions.map(t => t.description))];
  
  // Try Groq first for speed and quality (if key is available in env)
  // Note: On client-side, we might need a proxy or use NEXT_PUBLIC prefix.
  // Assuming it is available as a secret or via a server-side route if needed.
  const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;

  if (groqKey) {
    try {
      const mapping = await callAI(rawDescriptions, "https://api.groq.com/openai/v1/chat/completions", groqKey, "llama3-70b-8192");
      if (mapping) return applyMapping(transactions, mapping);
    } catch (e) {
      console.warn("Groq failed, falling back to OpenRouter:", e);
    }
  }

  // Fallback to OpenRouter (Gemini Flash is fast and free)
  if (openRouterKey) {
    try {
      const mapping = await callAI(rawDescriptions, "https://openrouter.ai/api/v1/chat/completions", openRouterKey, "google/gemini-2.0-flash-lite-preview-02-05:free");
      if (mapping) return applyMapping(transactions, mapping);
    } catch (e) {
      console.warn("OpenRouter failed, falling back to LocalClean:", e);
    }
  }

  return transactions.map(t => ({
    ...t,
    cleanDescription: localClean(t.description)
  }));
}

async function callAI(descriptions: string[], url: string, key: string, model: string) {
  const prompt = `
    Distill these messy Indian bank strings into clean, professional merchant or person names.
    
    RULES:
    1. Extract ONLY the core merchant name or person's name.
    2. Remove all transaction types (e.g., IMPS, NEFT, UPI, IFT, ACH, CASH DEPOSIT, RTGS, NACH).
    3. Remove all reference numbers, dates, phone numbers, and bank IDs (e.g., @okicici, @paytm, @ybl, .RZP).
    4. If it's a person (e.g., 'UPI-RADHIKA AGARWALA-63765'), return just 'Radhika Agarwala'.
    5. If it's a merchant (e.g., 'UPI-ZOMATO-ZOMATO.ORDER' or 'ZOMATO LTD'), return just 'Zomato'.
    6. Simplify terms like 'CREDIT INTEREST CAPITALISED' to just 'Interest'.
    7. Format the name using standard Title Case (e.g., 'Billionbrains Garage', 'Amazon').
    8. Respond ONLY with a valid JSON object where keys are the original exact strings and values are the clean names. Do NOT include markdown formatting or extra text.
    
    LIST:
    ${JSON.stringify(descriptions.slice(0, 50))}
  `;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(url, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": model,
      "messages": [{ "role": "user", "content": prompt }],
      "temperature": 0.1,
      "response_format": { "type": "json_object" }
    })
  });
  clearTimeout(id);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  
  let content = result.choices[0].message.content;
  if (content.includes("```json")) content = content.split("```json")[1].split("```")[0].trim();
  else if (content.includes("```")) content = content.split("```")[1].split("```")[1].trim();
  
  return JSON.parse(content);
}

function applyMapping(transactions: Transaction[], mapping: any): Transaction[] {
  return transactions.map(t => ({
    ...t,
    cleanDescription: mapping[t.description] || mapping[t.description.trim()] || localClean(t.description)
  }));
}
