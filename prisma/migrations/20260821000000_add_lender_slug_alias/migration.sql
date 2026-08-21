-- CreateTable
CREATE TABLE "LenderSlugAlias" (
    "id" TEXT NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LenderSlugAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LenderSlugAlias_oldSlug_key" ON "LenderSlugAlias"("oldSlug");

-- CreateIndex
CREATE INDEX "LenderSlugAlias_lenderId_idx" ON "LenderSlugAlias"("lenderId");

-- AddForeignKey
ALTER TABLE "LenderSlugAlias" ADD CONSTRAINT "LenderSlugAlias_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
