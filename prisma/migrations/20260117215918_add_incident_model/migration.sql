-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('REFUSAL', 'DELAY', 'IMBALANCE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'RESOLVED', 'ESCALATED');

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "planId" TEXT NOT NULL,
    "carrierId" TEXT,
    "warehouseId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidents_planId_idx" ON "incidents"("planId");

-- CreateIndex
CREATE INDEX "incidents_type_idx" ON "incidents"("type");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_is_deleted_idx" ON "incidents"("is_deleted");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_planId_fkey" FOREIGN KEY ("planId") REFERENCES "transport_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
