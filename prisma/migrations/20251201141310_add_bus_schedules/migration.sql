-- CreateEnum
CREATE TYPE "BusOperator" AS ENUM ('FLIXBUS', 'GETBYBUS', 'ARRIVA', 'BRIONI_PULA', 'CROATIABUS', 'PROMET_SPLIT', 'OTHER');

-- CreateTable
CREATE TABLE "bus_schedules" (
    "id" SERIAL NOT NULL,
    "transportServiceId" INTEGER,
    "operator" "BusOperator" NOT NULL,
    "busNumber" TEXT,
    "routeName" TEXT NOT NULL,
    "departureStopId" INTEGER NOT NULL,
    "arrivalStopId" INTEGER NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "totalCapacity" INTEGER NOT NULL,
    "availableSeats" INTEGER NOT NULL DEFAULT 0,
    "adultPrice" DECIMAL(65,30) NOT NULL,
    "childPrice" DECIMAL(65,30),
    "seniorPrice" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "operatingDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seasonStart" TIMESTAMP(3),
    "seasonEnd" TIMESTAMP(3),
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "busType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bus_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_bookings" (
    "id" SERIAL NOT NULL,
    "busScheduleId" INTEGER NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "seniors" INTEGER NOT NULL DEFAULT 0,
    "seatNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "operatorRef" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bus_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bus_schedules_departureStopId_arrivalStopId_departureTime_idx" ON "bus_schedules"("departureStopId", "arrivalStopId", "departureTime");

-- CreateIndex
CREATE INDEX "bus_schedules_operator_idx" ON "bus_schedules"("operator");

-- CreateIndex
CREATE INDEX "bus_schedules_status_idx" ON "bus_schedules"("status");

-- CreateIndex
CREATE INDEX "bus_schedules_departureTime_idx" ON "bus_schedules"("departureTime");

-- CreateIndex
CREATE INDEX "bus_bookings_busScheduleId_idx" ON "bus_bookings"("busScheduleId");

-- CreateIndex
CREATE INDEX "bus_bookings_bookingId_idx" ON "bus_bookings"("bookingId");

-- AddForeignKey
ALTER TABLE "bus_schedules" ADD CONSTRAINT "bus_schedules_transportServiceId_fkey" FOREIGN KEY ("transportServiceId") REFERENCES "transport_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_schedules" ADD CONSTRAINT "bus_schedules_departureStopId_fkey" FOREIGN KEY ("departureStopId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_schedules" ADD CONSTRAINT "bus_schedules_arrivalStopId_fkey" FOREIGN KEY ("arrivalStopId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_bookings" ADD CONSTRAINT "bus_bookings_busScheduleId_fkey" FOREIGN KEY ("busScheduleId") REFERENCES "bus_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_bookings" ADD CONSTRAINT "bus_bookings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
