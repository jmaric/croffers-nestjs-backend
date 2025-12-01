-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataProcessingConsentAt" TIMESTAMP(3),
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN     "privacyPolicyAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacyPolicyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledDeletionAt" TIMESTAMP(3),
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
