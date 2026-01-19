-- AlterTable
ALTER TABLE "users" ADD COLUMN     "storeLocationId" TEXT;

-- CreateIndex
CREATE INDEX "users_storeLocationId_idx" ON "users"("storeLocationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_storeLocationId_fkey" FOREIGN KEY ("storeLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
