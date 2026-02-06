import { config } from "../config.js";

const DEFAULT_PROMPT =
  "You are a Hebrew-first customer support assistant for agency clients. Respond clearly, briefly, and practically.";

type HistoryMessage = {
  authorType: string;
  text: string | null;
};

type BotLocation = {
  systemPrompt: string | null;
};

export async function generateBotReply(params: {
  location: BotLocation;
  history: HistoryMessage[];
  userMessage: string;
}) {
  if (!config.OPENAI_API_KEY) {
    return "הבוט פעיל אבל חסר OPENAI_API_KEY, יש להגדיר מפתח כדי לקבל תשובות AI.";
  }

  const systemPrompt = params.location.systemPrompt?.trim() || DEFAULT_PROMPT;

  const messages = [
    { role: "system", content: systemPrompt },
    ...params.history
      .filter((item) => item.text)
      .slice(-10)
      .map((item) => ({
        role: item.authorType === "customer" ? "user" : "assistant",
        content: item.text as string
      })),
    { role: "user", content: params.userMessage }
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: messages,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${details}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
  };

  return payload.output_text?.trim() || "מצטער, לא הצלחתי לענות כרגע. נסה שוב בעוד רגע.";
}
