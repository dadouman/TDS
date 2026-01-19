-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_acknowledged_createdAt_idx" ON "notifications"("userId", "acknowledged", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_planId_idx" ON "notifications"("planId");

-- CreateIndex
CREATE INDEX "notifications_is_deleted_idx" ON "notifications"("is_deleted");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_planId_fkey" FOREIGN KEY ("planId") REFERENCES "transport_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
