/*
  Warnings:

  - You are about to drop the column `destinationId` on the `transport_plans` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDeliveryTime` on the `transport_plans` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedHubTime` on the `transport_plans` table. All the data in the column will be lost.
  - You are about to drop the column `hubId` on the `transport_plans` table. All the data in the column will be lost.
  - You are about to drop the column `plannedLoadingTime` on the `transport_plans` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `transport_plans` table. All the data in the column will be lost.
  - You are about to drop the column `unitCount` on the `transport_plans` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'GROUPED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "transport_plans" DROP CONSTRAINT "transport_plans_destinationId_fkey";

-- DropForeignKey
ALTER TABLE "transport_plans" DROP CONSTRAINT "transport_plans_hubId_fkey";

-- DropForeignKey
ALTER TABLE "transport_plans" DROP CONSTRAINT "transport_plans_supplierId_fkey";

-- DropIndex
DROP INDEX "transport_plans_destinationId_idx";

-- DropIndex
DROP INDEX "transport_plans_hubId_idx";

-- DropIndex
DROP INDEX "transport_plans_supplierId_idx";

-- AlterTable
ALTER TABLE "transport_plans" DROP COLUMN "destinationId",
DROP COLUMN "estimatedDeliveryTime",
DROP COLUMN "estimatedHubTime",
DROP COLUMN "hubId",
DROP COLUMN "plannedLoadingTime",
DROP COLUMN "supplierId",
DROP COLUMN "unitCount",
ADD COLUMN     "plan_date" TIMESTAMP(3),
ADD COLUMN     "total_trips" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_units" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warehouse_id" TEXT;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "arrival_location_id" TEXT,
ADD COLUMN     "arrival_time" TIMESTAMP(3),
ADD COLUMN     "departure_location_id" TEXT,
ADD COLUMN     "departure_time" TIMESTAMP(3),
ADD COLUMN     "loading_time" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "departure_location_id" TEXT NOT NULL,
    "arrival_location_id" TEXT NOT NULL,
    "loading_date" TIMESTAMP(3) NOT NULL,
    "unit_count" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "trip_id" TEXT,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_plan_archives" (
    "id" TEXT NOT NULL,
    "original_plan_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "plan_date" TIMESTAMP(3),
    "status" "PlanStatus" NOT NULL,
    "total_trips" INTEGER NOT NULL,
    "total_units" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retention_date" TIMESTAMP(3) NOT NULL,
    "original_data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL,

    CONSTRAINT "transport_plan_archives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_departure_location_id_arrival_location_id_idx" ON "orders"("departure_location_id", "arrival_location_id");

-- CreateIndex
CREATE INDEX "orders_trip_id_idx" ON "orders"("trip_id");

-- CreateIndex
CREATE INDEX "orders_created_by_idx" ON "orders"("created_by");

-- CreateIndex
CREATE INDEX "orders_is_deleted_idx" ON "orders"("is_deleted");

-- CreateIndex
CREATE INDEX "transport_plan_archives_original_plan_id_idx" ON "transport_plan_archives"("original_plan_id");

-- CreateIndex
CREATE INDEX "transport_plan_archives_archived_at_idx" ON "transport_plan_archives"("archived_at");

-- CreateIndex
CREATE INDEX "transport_plan_archives_retention_date_idx" ON "transport_plan_archives"("retention_date");

-- CreateIndex
CREATE INDEX "transport_plans_warehouse_id_idx" ON "transport_plans"("warehouse_id");

-- CreateIndex
CREATE INDEX "transport_plans_plan_date_idx" ON "transport_plans"("plan_date");

-- CreateIndex
CREATE INDEX "trips_departure_location_id_arrival_location_id_idx" ON "trips"("departure_location_id", "arrival_location_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_departure_location_id_fkey" FOREIGN KEY ("departure_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_arrival_location_id_fkey" FOREIGN KEY ("arrival_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_departure_location_id_fkey" FOREIGN KEY ("departure_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_arrival_location_id_fkey" FOREIGN KEY ("arrival_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
