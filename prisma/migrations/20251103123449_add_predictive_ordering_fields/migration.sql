-- AlterTable
ALTER TABLE "ProductSetting" ADD COLUMN     "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "safetyStock" INTEGER NOT NULL DEFAULT 0;
