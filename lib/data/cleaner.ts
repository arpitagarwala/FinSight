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
  
  // Use current, stable free models from OpenRouter (NVIDIA Nemotron Nano is primary)
  const models = [
    "nvidia/nemotron-nano-9b-v2:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "qwen/qwen-2-7b-instruct:free",
    "google/gemini-flash-1.5-8b:free"
  ];

  const prompt = `
    Distill these Indian bank strings into clean merchant names (e.g. Zomato, Amazon, Uber, Flipkart). 
    Remove all bank/technical noise. Respond ONLY with a JSON mapping.
    
    LIST:
    ${JSON.stringify(rawDescriptions.slice(0, 50))}
  `;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);

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
          "messages": [{ "role": "user", "content": prompt }],
          "temperature": 0.1
        })
      });
      clearTimeout(id);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      
      if (result.error) throw new Error(result.error.message);
      
      let content = result.choices[0].message.content;
      if (content.includes("```json")) content = content.split("```json")[1].split("```")[0].trim();
      else if (content.includes("```")) content = content.split("```")[1].split("```")[0].trim();
      else {
        // Find first { and last }
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start !== -1 && end !== -1) content = content.substring(start, end + 1);
      }
      
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
