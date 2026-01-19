-- CreateTable
CREATE TABLE "cmrs" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "receivedCount" INTEGER,
    "damageDeclared" BOOLEAN NOT NULL DEFAULT false,
    "damageNotes" TEXT,
    "inspectorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cmrs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cmrs_tripId_key" ON "cmrs"("tripId");

-- CreateIndex
CREATE INDEX "cmrs_tripId_idx" ON "cmrs"("tripId");

-- CreateIndex
CREATE INDEX "cmrs_warehouseId_idx" ON "cmrs"("warehouseId");

-- CreateIndex
CREATE INDEX "cmrs_status_idx" ON "cmrs"("status");

-- CreateIndex
CREATE INDEX "cmrs_is_deleted_idx" ON "cmrs"("is_deleted");

-- AddForeignKey
ALTER TABLE "cmrs" ADD CONSTRAINT "cmrs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cmrs" ADD CONSTRAINT "cmrs_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
