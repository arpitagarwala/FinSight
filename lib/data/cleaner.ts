import { Transaction } from './parser';

function localClean(desc: string): string {
  return desc
    .replace(/\b(?:IMPS|UPI|NEFT|RTGS|NWD|CHG|ATM|TRANSFER)\b/gi, '')
    .replace(/[0-9]{8,}/g, '')
    .replace(/XX+/g, '')
    .replace(/\/[^ ]+/g, '')
    .replace(/@\w+/g, '')
    .replace(/-+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || desc;
}

export async function distillTransactions(transactions: Transaction[], apiKey: string): Promise<Transaction[]> {
  if (!apiKey) throw new Error("API Key required for smart cleaning.");

  const rawDescriptions = [...new Set(transactions.map(t => t.description))];
  
  const models = [
    "mistralai/mistral-7b-instruct:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.1-8b-instruct:free"
  ];

  const prompt = `
    Distill these Indian bank strings into clean merchant names (e.g. Zomato, Amazon, Uber). 
    Remove all bank codes and technical noise. Respond ONLY with a JSON mapping.
    
    LIST:
    ${JSON.stringify(rawDescriptions)}
  `;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://finsight.vercel.app", 
          "X-Title": "FinSight",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": model,
          "messages": [{ "role": "user", "content": prompt }]
        })
      });
      clearTimeout(id);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      
      if (result.error) throw new Error(result.error.message);
      
      let content = result.choices[0].message.content;
      if (content.includes("```json")) content = content.split("```json")[1].split("```")[0].trim();
      else if (content.includes("```")) content = content.split("```")[1].split("```")[0].trim();
      
      const mapping = JSON.parse(content);
      
      return transactions.map(t => ({
        ...t,
        cleanDescription: mapping[t.description] || mapping[t.description.trim()] || localClean(t.description)
      }));

    } catch (err: any) {
      console.warn(`Model ${model} failed:`, err.message);
      continue;
    }
  }

  return transactions.map(t => ({
    ...t,
    cleanDescription: localClean(t.description)
  }));
}
