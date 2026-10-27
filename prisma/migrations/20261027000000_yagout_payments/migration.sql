-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "orderNo" TEXT,
ADD COLUMN     "paidAmount" DOUBLE PRECISION,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentExpiresAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentRaw" JSONB,
ADD COLUMN     "paymentRef" TEXT,
ADD COLUMN     "paymentRequest" JSONB;

-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "yagoutEncryptionKey" TEXT,
ADD COLUMN     "yagoutMeId" TEXT,
ADD COLUMN     "yagoutPostUrl" TEXT,
ADD COLUMN     "yagoutUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_orderNo_key" ON "Appointment"("orderNo");

-- CreateIndex
CREATE INDEX "Appointment_status_paymentExpiresAt_idx" ON "Appointment"("status", "paymentExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_yagoutMeId_key" ON "Hospital"("yagoutMeId");


-- Existing pending-payment rows were all raised through the Super App.
UPDATE "Appointment" SET "paymentMethod" = 'NIB_SUPERAPP' WHERE "transactionId" IS NOT NULL AND "paymentMethod" IS NULL;

-- Permission for staff roles that may view/edit the hospital's YagoutPay credentials.
INSERT INTO "Permission" ("key", "name", "category", "description", "createdAt", "updatedAt")
VALUES ('PaymentSettings:Manage', 'Manage Payment Settings', 'Settings', 'Can view and update the hospital''s YagoutPay merchant credentials', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
