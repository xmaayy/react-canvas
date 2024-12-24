import 'server-only';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { and, asc, desc, eq, gt, gte } from 'drizzle-orm';
import { genSaltSync, hashSync } from 'bcrypt-ts';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
} from './schema';
import { BlockKind } from '@/components/block';

/**
 * Create the database client and Drizzle instance for SQLite
 */
const client = createClient({
  url: process.env.DATABASE_URL!, // e.g. file:./mydb.sqlite or a libsql endpoint
});
const db = drizzle(client);

/** 
 * Get a user by email 
 */
export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

/** 
 * Create a new user (email/password)
 */
export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ id: crypto.randomUUID(), email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

/**
 * Save a new Chat
 * IMPORTANT: store createdAt as an ISO string because
 * your schema’s createdAt is declared as text.
 */
export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date().toISOString(), // store as text
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

/**
 * Delete a chat by ID (also deletes votes and messages for that chat)
 */
export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

/**
 * Get all chats for a user, ordered descending by createdAt
 */
export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

/**
 * Get a single chat by ID
 */
export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

/**
 * Save a batch of messages
 */
export async function saveMessages({ messages }: { messages: Array<Message> }) {
  console.log('messages', messages);
  try {
    const serializedMessages = messages.map((m) => ({
      ...m,
      content: JSON.stringify(m.content),
    }));
    return await db.insert(message).values(serializedMessages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

/**
 * Get all messages for a chat, ordered ascending by createdAt
 */
export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const rows = await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
    return rows.map((r) => ({
      ...r,
      content: JSON.parse(r.content as string),
    }));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

/**
 * Upvote/downvote a message
 * Remember isUpvoted is stored as an integer (0 or 1).
 */
export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    const isUpvotedInt = type === 'up' ? 1 : 0;

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: isUpvotedInt })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: isUpvotedInt,
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

/**
 * Get votes by chat ID
 */
export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

/**
 * Save a new Document
 */
export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: BlockKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date().toISOString(), // store date as ISO string
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

/**
 * Get all documents by ID (all "versions" of that document),
 * ordered ascending by createdAt
 */
export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

/**
 * Get a single document (the "latest" one, descending by createdAt)
 */
export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

/**
 * Delete documents with given ID that have a createdAt AFTER a specified timestamp
 */
export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const isoTimestamp = timestamp.toISOString();

    // First delete suggestions referencing those document versions
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, isoTimestamp),
        ),
      );

    // Then delete the document versions
    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, isoTimestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

/**
 * Save a batch of suggestions
 */
export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

/**
 * Get all suggestions for a given document (all versions)
 */
export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

/**
 * Get a message by ID
 */
export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

/**
 * Delete messages in a given chat that were created AFTER a specified timestamp
 */
export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const isoTimestamp = timestamp.toISOString();
    return await db
      .delete(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, isoTimestamp)),
      );
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

/**
 * Update a chat's visibility
 */
export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}
