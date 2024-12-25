import { openai, createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOllama } from "ollama-ai-provider";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { Model } from "./models";

import { customMiddleware } from "./custom-middleware";

const getProvider = (provider: string, apiIdentifier: string) => {
  switch (provider) {
    case "openai":
      return openai(apiIdentifier);
    case "google":
      return google(apiIdentifier);
    case "groq":
      return groq(apiIdentifier);
    case "ollama":
      return createOpenAI({
        baseURL: "http://localhost:11434/v1",
        apiKey: "ollama", // required but unused
        name: "ollama",
      }).languageModel(apiIdentifier);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

export const customModel = (model: Model) => {
  console.log("Model Wrapper", model);
  return wrapLanguageModel({
    model: getProvider(model.provider, model.apiIdentifier),
    middleware: customMiddleware,
  });
};
