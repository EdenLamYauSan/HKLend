-- CreateUniqueIndex: identifier + type (at most one active token per type per identity)
CREATE UNIQUE INDEX "verification_tokens_identifier_type_key" ON "verification_tokens"("identifier", "type");
