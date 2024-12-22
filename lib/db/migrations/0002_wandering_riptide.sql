CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Vote" (
    "chatId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "isUpvoted" INTEGER NOT NULL,
    PRIMARY KEY ("chatId", "messageId")
);

ALTER TABLE "Chat" ADD COLUMN "title" TEXT NOT NULL;

-- Dropping the unsupported column
ALTER TABLE "Chat" DROP COLUMN "messages";
