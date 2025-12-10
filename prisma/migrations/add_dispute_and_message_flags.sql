-- Add dispute system and message flagging for admin oversight

-- Create Dispute enum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');
CREATE TYPE "DisputeType" AS ENUM ('PAYMENT_ISSUE', 'SERVICE_NOT_PROVIDED', 'CANCELLATION', 'DAMAGE_CLAIM', 'HARASSMENT', 'OTHER');

-- Create Dispute table
CREATE TABLE "disputes" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "initiatorId" INTEGER NOT NULL REFERENCES "users"("id"),
  "respondentId" INTEGER NOT NULL REFERENCES "users"("id"),
  "type" "DisputeType" NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "conversationId" INTEGER REFERENCES "conversations"("id"),
  "assignedAdminId" INTEGER REFERENCES "users"("id"),
  "resolution" TEXT,
  "refundAmount" DECIMAL(10, 2),
  "resolvedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "disputes_bookingId_idx" ON "disputes"("bookingId");
CREATE INDEX "disputes_initiatorId_idx" ON "disputes"("initiatorId");
CREATE INDEX "disputes_status_idx" ON "disputes"("status");
CREATE INDEX "disputes_assignedAdminId_idx" ON "disputes"("assignedAdminId");

-- Add flagging to messages
ALTER TABLE "messages"
  ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "flaggedBy" INTEGER REFERENCES "users"("id"),
  ADD COLUMN "flagReason" TEXT,
  ADD COLUMN "flaggedAt" TIMESTAMP,
  ADD COLUMN "reviewedBy" INTEGER REFERENCES "users"("id"),
  ADD COLUMN "reviewedAt" TIMESTAMP;

CREATE INDEX "messages_isFlagged_idx" ON "messages"("isFlagged");

-- Add admin access log for conversations
CREATE TABLE "conversation_access_logs" (
  "id" SERIAL PRIMARY KEY,
  "conversationId" INTEGER NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "adminId" INTEGER NOT NULL REFERENCES "users"("id"),
  "reason" TEXT NOT NULL,
  "accessedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "conversation_access_logs_conversationId_idx" ON "conversation_access_logs"("conversationId");
CREATE INDEX "conversation_access_logs_adminId_idx" ON "conversation_access_logs"("adminId");
