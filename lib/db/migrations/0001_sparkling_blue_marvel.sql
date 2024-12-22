CREATE TABLE IF NOT EXISTS "Suggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "documentCreatedAt" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "description" TEXT,
    "isResolved" INTEGER DEFAULT 0 NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id"),
    FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES "Document" ("id", "createdAt")
);

CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "userId" TEXT NOT NULL,
    PRIMARY KEY ("id", "createdAt"),
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT
);
