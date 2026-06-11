-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reply" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replied_at" TIMESTAMPTZ,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_messages_user_id_created_at_idx" ON "support_messages"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "support_messages_status_idx" ON "support_messages"("status");
