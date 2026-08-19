-- AlterTable: make address fields optional, add licenceExpiryDate
ALTER TABLE "Lender"
  ADD COLUMN "licenceExpiryDate" TIMESTAMP(3),
  ALTER COLUMN "addressZh" DROP NOT NULL,
  ALTER COLUMN "districtZh" DROP NOT NULL;
