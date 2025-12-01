-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SEASONAL');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PRICE_DROP', 'AVAILABILITY', 'SPECIAL_OFFER');

-- CreateEnum
CREATE TYPE "ModificationType" AS ENUM ('DATE_CHANGE', 'GUEST_COUNT_CHANGE', 'SERVICE_UPGRADE', 'SERVICE_ADDITION', 'SERVICE_REMOVAL', 'CANCELLATION');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "groupCoordinator" TEXT,
ADD COLUMN     "groupDiscount" DECIMAL(65,30),
ADD COLUMN     "groupSize" INTEGER,
ADD COLUMN     "isGroupBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "packageId" INTEGER;

-- CreateTable
CREATE TABLE "service_packages" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "packagePrice" DECIMAL(65,30) NOT NULL,
    "regularPrice" DECIMAL(65,30) NOT NULL,
    "savings" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "maxGuests" INTEGER,
    "minGuests" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_items" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "serviceId" INTEGER,
    "bookingId" INTEGER,
    "alertType" "AlertType" NOT NULL DEFAULT 'PRICE_DROP',
    "targetPrice" DECIMAL(65,30),
    "percentage" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "guests" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTriggered" BOOLEAN NOT NULL DEFAULT false,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_modifications" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "modificationType" "ModificationType" NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "priceDifference" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_modifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_packages_supplierId_idx" ON "service_packages"("supplierId");

-- CreateIndex
CREATE INDEX "service_packages_status_idx" ON "service_packages"("status");

-- CreateIndex
CREATE INDEX "package_items_packageId_idx" ON "package_items"("packageId");

-- CreateIndex
CREATE INDEX "package_items_serviceId_idx" ON "package_items"("serviceId");

-- CreateIndex
CREATE INDEX "price_alerts_userId_isActive_idx" ON "price_alerts"("userId", "isActive");

-- CreateIndex
CREATE INDEX "price_alerts_serviceId_isActive_idx" ON "price_alerts"("serviceId", "isActive");

-- CreateIndex
CREATE INDEX "price_alerts_isTriggered_idx" ON "price_alerts"("isTriggered");

-- CreateIndex
CREATE INDEX "booking_modifications_bookingId_idx" ON "booking_modifications"("bookingId");

-- CreateIndex
CREATE INDEX "booking_modifications_status_idx" ON "booking_modifications"("status");

-- CreateIndex
CREATE INDEX "bookings_isGroupBooking_idx" ON "bookings"("isGroupBooking");

-- CreateIndex
CREATE INDEX "bookings_packageId_idx" ON "bookings"("packageId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "service_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "service_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_modifications" ADD CONSTRAINT "booking_modifications_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
