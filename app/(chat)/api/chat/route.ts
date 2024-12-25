import {
  type Message,
  convertToCoreMessages,
  createDataStreamResponse,
  streamObject,
  streamText,
} from "ai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { customModel } from "@/lib/ai";
import { models } from "@/lib/ai/models";
import {
  codePrompt,
  systemPrompt,
  updateDocumentPrompt,
} from "@/lib/ai/prompts";
import {
  deleteChatById,
  getChatById,
  getDocumentById,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
} from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";

import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 60;

type AllowedTools =
  | "createDocument"
  | "updateDocument"
  | "requestSuggestions"
  | "getWeather";

const blocksTools: AllowedTools[] = [
  "createDocument",
  "updateDocument",
  "requestSuggestions",
];

const weatherTools: AllowedTools[] = ["getWeather"];

const allTools: AllowedTools[] = [...blocksTools, ...weatherTools];

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  // We're doing something a bit weird here and allowing the user to send multiple
  // models in one string because with offline models you generally have a 'stable' of
  // them that work better for different tasks. This is a bit of a hack to get around
  // the fact that we can't send multiple models in the request. The JSON structure is
  // "{ chat: "llama3.2", code: "gemini-2.0-flash-exp", text: "llama-3.3-70b-alt" }""
  const {
    chat: chatModelId,
    code: codeModelId,
    text: textModelId,
  } = JSON.parse(modelId);

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const chatModel = models.find((model) => model.id === chatModelId);

  console.log("Models", modelId, "Chat", chatModel);
  if (!chatModel) {
    return new Response("Model not found", { status: 404 });
  }

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({
      message: userMessage,
      modelId: chatModelId,
    });
    await saveChat({ id, userId: session.user.id, title });
  }

  const userMessageId = generateUUID();

  await saveMessages({
    messages: [
      {
        ...userMessage,
        id: userMessageId,
        createdAt: new Date().toISOString(),
        chatId: id,
        content: JSON.stringify(userMessage.content),
      },
    ],
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      dataStream.writeData({
        type: "user-message-id",
        content: userMessageId,
      });
      console.log("User Message", userMessage, chatModel);
      const result = streamText({
        model: customModel(chatModel),
        system: systemPrompt,
        messages: coreMessages,
        maxSteps: 5,
        experimental_activeTools: allTools,
        tools: {
          getWeather: {
            description: "Get the current weather at a location",
            parameters: z.object({
              latitude: z.number(),
              longitude: z.number(),
            }),
            execute: async ({ latitude, longitude }) => {
              const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
              );

              const weatherData = await response.json();
              return weatherData;
            },
          },
          createDocument: {
            description:
              "When prompted for a document (kind: text) or code (kind: code), use this tool with a descriptive title and detailed description to inform a generator model about the users desired content, without directly creating it.",
            parameters: z.object({
              title: z.string(),
              kind: z.enum(["text", "code"]),
              description: z.string(),
            }),
            execute: async ({ title, kind, description }, { messages }) => {
              const id = generateUUID();
              let draftText = "";

              dataStream.writeData({
                type: "id",
                content: id,
              });

              dataStream.writeData({
                type: "title",
                content: title,
              });

              dataStream.writeData({
                type: "kind",
                content: kind,
              });

              dataStream.writeData({
                type: "clear",
                content: "",
              });

              const lastMessage = JSON.stringify(
                messages.at(messages.length - 1)?.content
              );
              const generationDescription = `${title} \n\n ${description} \n\n Last User Message:\n${lastMessage}`;

              if (kind === "text") {
                console.debug(`ROUTE - CREATE DOC - ${generationDescription}`);
                const { fullStream } = streamText({
                  model: customModel(
                    models.find((model) => model.id === textModelId)!
                  ),
                  system:
                    "Write about the given topic. Markdown is supported. Use headings wherever appropriate. Details from the user message should be prioritized over other details.",
                  prompt: generationDescription,
                });

                for await (const delta of fullStream) {
                  const { type } = delta;

                  if (type === "text-delta") {
                    const { textDelta } = delta;

                    draftText += textDelta;
                    dataStream.writeData({
                      type: "text-delta",
                      content: textDelta,
                    });
                  }
                }

                dataStream.writeData({ type: "finish", content: "" });
              } else if (kind === "code") {
                console.debug(`ROUTE - CREATE CODE - ${generationDescription}`);
                const { fullStream } = streamObject({
                  model: customModel(
                    models.find((model) => model.id === codeModelId)!
                  ),
                  system: codePrompt,
                  prompt: generationDescription,
                  schema: z.object({
                    code: z.string(),
                  }),
                });

                for await (const delta of fullStream) {
                  const { type } = delta;

                  if (type === "object") {
                    const { object } = delta;
                    const { code } = object;

                    if (code) {
                      dataStream.writeData({
                        type: "code-delta",
                        content: code ?? "",
                      });

                      draftText = code;
                    }
                  }
                }

                dataStream.writeData({ type: "finish", content: "" });
              }

              if (session.user?.id) {
                await saveDocument({
                  id,
                  title,
                  kind,
                  content: draftText,
                  userId: session.user.id,
                });
              }

              return {
                id,
                title,
                kind,
                content:
                  "The document was created and is now visible to the user. Inform them of this and end your turn.",
              };
            },
          },
          updateDocument: {
            description: "Update a document with the given description.",
            parameters: z.object({
              id: z.string().describe("The ID of the document to update"),
              description: z
                .string()
                .describe("The description of changes that need to be made"),
            }),
            execute: async ({ id, description }) => {
              const document = await getDocumentById({ id });

              if (!document) {
                return {
                  error: "Document not found",
                };
              }

              const { content: currentContent } = document;
              let draftText = "";

              dataStream.writeData({
                type: "clear",
                content: document.title,
              });

              if (document.kind === "text") {
                const { fullStream } = streamText({
                  model: customModel(
                    models.find((model) => model.id === textModelId)!
                  ),
                  system: updateDocumentPrompt(currentContent),
                  prompt: description,
                  experimental_providerMetadata: {
                    openai: {
                      prediction: {
                        type: "content",
                        content: currentContent,
                      },
                    },
                  },
                });

                for await (const delta of fullStream) {
                  const { type } = delta;

                  if (type === "text-delta") {
                    const { textDelta } = delta;

                    draftText += textDelta;
                    dataStream.writeData({
                      type: "text-delta",
                      content: textDelta,
                    });
                  }
                }

                dataStream.writeData({ type: "finish", content: "" });
              } else if (document.kind === "code") {
                const { fullStream } = streamObject({
                  model: customModel(
                    models.find((model) => model.id === codeModelId)!
                  ),
                  system: updateDocumentPrompt(currentContent),
                  prompt: description,
                  schema: z.object({
                    code: z.string(),
                  }),
                });

                for await (const delta of fullStream) {
                  const { type } = delta;

                  if (type === "object") {
                    const { object } = delta;
                    const { code } = object;

                    if (code) {
                      dataStream.writeData({
                        type: "code-delta",
                        content: code ?? "",
                      });

                      draftText = code;
                    }
                  }
                }

                dataStream.writeData({ type: "finish", content: "" });
              }

              if (session.user?.id) {
                await saveDocument({
                  id,
                  title: document.title,
                  content: draftText,
                  kind: document.kind,
                  userId: session.user.id,
                });
              }

              return {
                id,
                title: document.title,
                kind: document.kind,
                content: "The document has been updated successfully.",
              };
            },
          },
          requestSuggestions: {
            description: "Request suggestions for a document",
            parameters: z.object({
              documentId: z
                .string()
                .describe("The ID of the document to request edits"),
            }),
            execute: async ({ documentId }) => {
              const document = await getDocumentById({ id: documentId });

              if (!document || !document.content) {
                return {
                  error: "Document not found",
                };
              }

              const suggestions: Array<
                Omit<Suggestion, "userId" | "createdAt" | "documentCreatedAt">
              > = [];

              const { elementStream } = streamObject({
                model: customModel(
                  models.find((model) => model.id === textModelId)!
                ),
                system:
                  "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
                prompt: document.content,
                output: "array",
                schema: z.object({
                  originalSentence: z
                    .string()
                    .describe("The original sentence"),
                  suggestedSentence: z
                    .string()
                    .describe("The suggested sentence"),
                  description: z
                    .string()
                    .describe("The description of the suggestion"),
                }),
              });

              for await (const element of elementStream) {
                const suggestion = {
                  originalText: element.originalSentence,
                  suggestedText: element.suggestedSentence,
                  description: element.description,
                  id: generateUUID(),
                  documentId: documentId,
                  isResolved: false,
                };

                dataStream.writeData({
                  type: "suggestion",
                  content: suggestion,
                });

                suggestions.push(suggestion);
              }

              if (session.user?.id) {
                const userId = session.user.id;

                await saveSuggestions({
                  suggestions: suggestions.map((suggestion) => ({
                    ...suggestion,
                    userId,
                    createdAt: new Date(),
                    documentCreatedAt: document.createdAt,
                  })),
                });
              }

              return {
                id: documentId,
                title: document.title,
                kind: document.kind,
                message: "Suggestions have been added to the document",
              };
            },
          },
        },
        onFinish: async ({ response }) => {
          if (session.user?.id) {
            try {
              console.log(
                "Unsanitized Response",
                JSON.stringify(response.messages)
              );
              const responseMessagesWithoutIncompleteToolCalls =
                sanitizeResponseMessages(response.messages);
              await saveMessages({
                messages: responseMessagesWithoutIncompleteToolCalls.map(
                  (message) => {
                    const messageId = generateUUID();

                    if (message.role === "assistant") {
                      dataStream.writeMessageAnnotation({
                        messageIdFromServer: messageId,
                      });
                    }

                    //let finalContent: string = JSON.stringify(message.content);

                    return {
                      id: messageId,
                      chatId: id,
                      role: message.role,
                      content: message.content,
                      createdAt: new Date().toISOString(),
                    };
                  }
                ),
              });
            } catch (error) {
              console.error("Failed to save chat");
            }
          }
        },

        experimental_telemetry: {
          isEnabled: true,
          functionId: "stream-text",
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError(error) {
      console.error("Error:", error);
      return "An error occurred while processing your request";
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
