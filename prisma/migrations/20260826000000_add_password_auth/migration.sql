-- AddColumn: passwordHash to users
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;

-- AddColumn: type to verification_tokens (default "email_verify" for existing rows)
ALTER TABLE "verification_tokens" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'email_verify';
