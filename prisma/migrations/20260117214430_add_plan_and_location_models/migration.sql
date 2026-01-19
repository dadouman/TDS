/*
  Warnings:

  - You are about to drop the column `isDeleted` on the `locations` table. All the data in the column will be lost.
  - You are about to drop the column `destinationStore` on the `transport_plans` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `transport_plans` table. All the data in the column will be lost.
  - You are about to drop the column `supplierLocation` on the `transport_plans` table. All the data in the column will be lost.
  - The `status` column on the `transport_plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `locations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `destinationId` to the `transport_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierId` to the `transport_plans` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('SUPPLIER', 'HUB', 'STORE');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'PROPOSED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "locations" DROP COLUMN "isDeleted",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
DROP COLUMN "type",
ADD COLUMN     "type" "LocationType" NOT NULL;

-- AlterTable
ALTER TABLE "transport_plans" DROP COLUMN "destinationStore",
DROP COLUMN "isDeleted",
DROP COLUMN "supplierLocation",
ADD COLUMN     "destinationId" TEXT NOT NULL,
ADD COLUMN     "estimatedDeliveryTime" TIMESTAMP(3),
ADD COLUMN     "estimatedHubTime" TIMESTAMP(3),
ADD COLUMN     "hubId" TEXT,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "supplierId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- CreateIndex
CREATE INDEX "locations_is_deleted_idx" ON "locations"("is_deleted");

-- CreateIndex
CREATE INDEX "transport_plans_supplierId_idx" ON "transport_plans"("supplierId");

-- CreateIndex
CREATE INDEX "transport_plans_destinationId_idx" ON "transport_plans"("destinationId");

-- CreateIndex
CREATE INDEX "transport_plans_hubId_idx" ON "transport_plans"("hubId");

-- CreateIndex
CREATE INDEX "transport_plans_createdBy_idx" ON "transport_plans"("createdBy");

-- CreateIndex
CREATE INDEX "transport_plans_status_idx" ON "transport_plans"("status");

-- CreateIndex
CREATE INDEX "transport_plans_is_deleted_idx" ON "transport_plans"("is_deleted");

-- AddForeignKey
ALTER TABLE "transport_plans" ADD CONSTRAINT "transport_plans_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_plans" ADD CONSTRAINT "transport_plans_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_plans" ADD CONSTRAINT "transport_plans_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_plans" ADD CONSTRAINT "transport_plans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
