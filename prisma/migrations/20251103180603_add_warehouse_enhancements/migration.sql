-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'Active',
ADD COLUMN     "type" TEXT;

-- CreateIndex
CREATE INDEX "Warehouse_parentId_idx" ON "Warehouse"("parentId");

-- CreateIndex
CREATE INDEX "Warehouse_status_idx" ON "Warehouse"("status");

-- CreateIndex
CREATE INDEX "Warehouse_type_idx" ON "Warehouse"("type");

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
