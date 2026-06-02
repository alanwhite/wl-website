-- Optional terms / supporting document attached to a public form. Sent as an email
-- attachment when a submission is approved (and referenced in the email body).
ALTER TABLE "PublicForm" ADD COLUMN "termsMediaId" TEXT;
ALTER TABLE "PublicForm" ADD CONSTRAINT "PublicForm_termsMediaId_fkey"
  FOREIGN KEY ("termsMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "PublicForm_termsMediaId_idx" ON "PublicForm"("termsMediaId");
