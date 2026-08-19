-- Add MLR No. field for PDF-sourced lender records (pending/expired/dismissed/withdrawn)
ALTER TABLE "Lender" ADD COLUMN IF NOT EXISTS "mlrNumber" INTEGER;
