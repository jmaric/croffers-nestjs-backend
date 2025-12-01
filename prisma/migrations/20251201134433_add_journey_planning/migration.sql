-- CreateEnum
CREATE TYPE "JourneyStatus" AS ENUM ('PLANNING', 'READY', 'BOOKING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('AIRPORT_TRANSFER', 'FERRY', 'TRANSPORT', 'ACCOMMODATION', 'ACTIVITY', 'TOUR', 'EVENT');

-- CreateTable
CREATE TABLE "journeys" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "JourneyStatus" NOT NULL DEFAULT 'PLANNING',
    "name" TEXT,
    "originLocationId" INTEGER NOT NULL,
    "destLocationId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "travelers" INTEGER NOT NULL DEFAULT 1,
    "preferences" JSONB,
    "optimizedRoute" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_segments" (
    "id" SERIAL NOT NULL,
    "journeyId" INTEGER NOT NULL,
    "segmentType" "SegmentType" NOT NULL,
    "segmentOrder" INTEGER NOT NULL,
    "serviceId" INTEGER,
    "bookingId" INTEGER,
    "departureLocationId" INTEGER,
    "arrivalLocationId" INTEGER,
    "departureTime" TIMESTAMP(3),
    "arrivalTime" TIMESTAMP(3),
    "duration" INTEGER,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journeys_userId_idx" ON "journeys"("userId");

-- CreateIndex
CREATE INDEX "journeys_status_idx" ON "journeys"("status");

-- CreateIndex
CREATE INDEX "journeys_startDate_idx" ON "journeys"("startDate");

-- CreateIndex
CREATE INDEX "journeys_createdAt_idx" ON "journeys"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "journey_segments_journeyId_idx" ON "journey_segments"("journeyId");

-- CreateIndex
CREATE INDEX "journey_segments_segmentOrder_idx" ON "journey_segments"("segmentOrder");

-- CreateIndex
CREATE INDEX "journey_segments_serviceId_idx" ON "journey_segments"("serviceId");

-- CreateIndex
CREATE INDEX "journey_segments_isBooked_idx" ON "journey_segments"("isBooked");

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_originLocationId_fkey" FOREIGN KEY ("originLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_destLocationId_fkey" FOREIGN KEY ("destLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_segments" ADD CONSTRAINT "journey_segments_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_segments" ADD CONSTRAINT "journey_segments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_segments" ADD CONSTRAINT "journey_segments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_segments" ADD CONSTRAINT "journey_segments_departureLocationId_fkey" FOREIGN KEY ("departureLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_segments" ADD CONSTRAINT "journey_segments_arrivalLocationId_fkey" FOREIGN KEY ("arrivalLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
