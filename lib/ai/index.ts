import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';
import { Model } from './models';

import { customMiddleware } from './custom-middleware';

const getProvider = (provider: string, apiIdentifier: string) => {
  switch (provider) {
    case 'openai':
      return openai(apiIdentifier);
    case 'google':
      return google(apiIdentifier);
    case 'groq':
      return groq(apiIdentifier);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

export const customModel = (model: Model) => {
  return wrapLanguageModel({
    model: getProvider(model.provider, model.apiIdentifier),
    middleware: customMiddleware,
  });
};
