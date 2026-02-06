import { config } from "../config.js";

type OpenAiStatus = {
  configured: boolean;
  connected: boolean;
  models: string[];
  detail?: string;
};

type GhlStatus = {
  configured: boolean;
  connected: boolean;
  detail?: string;
};

const FALLBACK_MODELS = [
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4o-mini",
  "gpt-4o"
];

export async function getOpenAiStatus(): Promise<OpenAiStatus> {
  if (!config.OPENAI_API_KEY) {
    return {
      configured: false,
      connected: false,
      models: FALLBACK_MODELS,
      detail: "OPENAI_API_KEY is missing"
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        authorization: `Bearer ${config.OPENAI_API_KEY}`
      }
    });

    if (!response.ok) {
      return {
        configured: true,
        connected: false,
        models: FALLBACK_MODELS,
        detail: `OpenAI responded ${response.status}`
      };
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: string }>;
    };

    const models = (payload.data || [])
      .map((item) => item.id || "")
      .filter((id) => id.startsWith("gpt-4") || id.startsWith("o"))
      .sort();

    return {
      configured: true,
      connected: true,
      models: models.length > 0 ? models : FALLBACK_MODELS
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      models: FALLBACK_MODELS,
      detail: error instanceof Error ? error.message : "OpenAI request failed"
    };
  }
}

export async function getGhlStatus(locationId: string, ghlApiKey?: string | null): Promise<GhlStatus> {
  if (!ghlApiKey) {
    return {
      configured: false,
      connected: false,
      detail: "Location GHL API key missing"
    };
  }

  try {
    const response = await fetch(`${config.GHL_API_BASE}/locations/${locationId}`, {
      headers: {
        Authorization: `Bearer ${ghlApiKey}`,
        Version: config.GHL_API_VERSION,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      return {
        configured: true,
        connected: false,
        detail: `GHL responded ${response.status}`
      };
    }

    return {
      configured: true,
      connected: true
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      detail: error instanceof Error ? error.message : "GHL request failed"
    };
  }
}
