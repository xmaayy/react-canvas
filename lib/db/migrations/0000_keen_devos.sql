CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY NOT NULL, -- UUID replaced with TEXT
    "email" TEXT NOT NULL,          -- varchar(64) replaced with TEXT
    "password" TEXT                 -- varchar(64) replaced with TEXT
);

CREATE TABLE IF NOT EXISTS "Chat" (
    "id" TEXT PRIMARY KEY NOT NULL,         -- UUID replaced with TEXT
    "createdAt" TEXT NOT NULL,              -- Timestamp stored as ISO8601 string
    "messages" TEXT NOT NULL,               -- JSON replaced with TEXT
    "userId" TEXT NOT NULL,                 -- UUID replaced with TEXT
    FOREIGN KEY ("userId") REFERENCES "User" ("id") -- Foreign key simplified
);
