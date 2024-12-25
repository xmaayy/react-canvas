import { config } from "dotenv";

config({
  path: ".env.local",
});

const { OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY } =
  process.env;

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
  capabilities: {
    chat: boolean;
    text: boolean;
    code: boolean;
  };
  provider: "openai" | "google" | "groq" | "ollama";
}

export const models: Array<Model> = [
  /*{
    id: "gpt-4o-mini",
    label: "GPT 4o mini",
    apiIdentifier: "gpt-4o-mini",
    provider: "openai",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "gpt-4o",
    label: "GPT 4o",
    apiIdentifier: "gpt-4o",
    provider: "openai",
    description: "For complex, multi-step tasks",
  },
  */
  {
    id: "llama-3.3-70b",
    label: "LLaMa 3.3 70b",
    apiIdentifier: "llama-3.3-70b-versatile",
    provider: "groq",
    description: "Fast and Solid Model for a wide range of tasks",
    capabilities: { chat: false, text: true, code: false },
  },
  {
    id: "llama-3.3-70b-alt",
    label: "LLaMa 3.3 70b (Spec Decode)",
    apiIdentifier: "llama-3.3-70b-specdec",
    provider: "groq",
    description: "Even faster 70B model with speculative decoding",
    capabilities: { chat: false, text: true, code: false },
  },
  {
    id: "gemini-2.0-flash-exp",
    label: "Gemini Flash 2 (Experimental)",
    apiIdentifier: "gemini-2.0-flash-exp",
    provider: "google",
    description: "Fast and Accurate Model",
    capabilities: { chat: true, text: true, code: true },
  },
  {
    id: "gemini-exp-1206",
    label: "Gemini Experimental (12/06)",
    apiIdentifier: "gemini-exp-1206",
    provider: "google",
    description: "Fast and Accurate Model",
    capabilities: { chat: true, text: true, code: true },
  },
  {
    id: "gemini-2.0-flash-thinking-exp-1219",
    label: "Gemini Thinking Flash 2 (Experimental 12/19)",
    apiIdentifier: "gemini-2.0-flash-thinking-exp-1219",
    provider: "google",
    description: "Fast and Accurate Model",
    capabilities: { chat: true, text: true, code: true },
  },
  {
    id: "qwen2.5-coder:14b",
    label: "Qwen 2.5 Coder 14B",
    apiIdentifier: "qwen2.5-coder:14b",
    provider: "ollama",
    description: "Good tool calling, small params",
    capabilities: { chat: true, text: true, code: true },
  },
  {
    id: "llama3.2",
    label: "Llama3.2",
    apiIdentifier: "llama3.2",
    provider: "ollama",
    description: "Good tool calling, small params",
    capabilities: { chat: false, text: true, code: true },
  },
] as const;

/*
export const models: Array<Model> = allModels.filter(model => {
  if (model.provider === 'openai' && !OPENAI_API_KEY) return false;
  if (model.provider === 'google' && !GOOGLE_GENAI_API_KEY) return false;
  if (model.provider === 'groq' && !GROQ_API_KEY) return false;
  return true;
});
*/
export const DEFAULT_MODEL_NAME: string = models[0]?.id || "";

export const DEFAULT_MODEL_ROSTER: string = JSON.stringify({
  chat: DEFAULT_MODEL_NAME,
  text: DEFAULT_MODEL_NAME,
  code: DEFAULT_MODEL_NAME,
});
