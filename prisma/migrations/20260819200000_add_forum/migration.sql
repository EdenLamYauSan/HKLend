-- CreateEnum
CREATE TYPE "ForumCategory" AS ENUM ('LENDER_RECO', 'LOAN_QUESTION', 'REPAYMENT', 'INDUSTRY');

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "category" "ForumCategory" NOT NULL,
    "titleZh" TEXT NOT NULL,
    "bodyZh" TEXT NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT '匿名',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReply" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "bodyZh" TEXT NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT '匿名',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyToId" TEXT,

    CONSTRAINT "ForumReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumPost_category_createdAt_idx" ON "ForumPost"("category", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ForumPost_upvotes_idx" ON "ForumPost"("upvotes" DESC);

-- CreateIndex
CREATE INDEX "ForumReply_postId_createdAt_idx" ON "ForumReply"("postId", "createdAt" ASC);

-- AddForeignKey
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ForumReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
