-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'PROPOSED',
    "acceptedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "refusalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_carrierId_idx" ON "trips"("carrierId");

-- CreateIndex
CREATE INDEX "trips_planId_idx" ON "trips"("planId");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trips_is_deleted_idx" ON "trips"("is_deleted");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_planId_fkey" FOREIGN KEY ("planId") REFERENCES "transport_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
