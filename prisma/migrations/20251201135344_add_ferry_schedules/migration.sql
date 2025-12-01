-- CreateEnum
CREATE TYPE "FerryOperator" AS ENUM ('JADROLINIJA', 'KRILO', 'TP_LINE', 'KAPETAN_LUKA', 'OTHER');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('SCHEDULED', 'DELAYED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "ferry_schedules" (
    "id" SERIAL NOT NULL,
    "transportServiceId" INTEGER,
    "operator" "FerryOperator" NOT NULL,
    "vesselName" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "departurePortId" INTEGER NOT NULL,
    "arrivalPortId" INTEGER NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "totalCapacity" INTEGER NOT NULL,
    "vehicleCapacity" INTEGER,
    "availableSeats" INTEGER NOT NULL DEFAULT 0,
    "availableVehicles" INTEGER DEFAULT 0,
    "adultPrice" DECIMAL(65,30) NOT NULL,
    "childPrice" DECIMAL(65,30),
    "vehiclePrice" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "operatingDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seasonStart" TIMESTAMP(3),
    "seasonEnd" TIMESTAMP(3),
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ferry_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ferry_bookings" (
    "id" SERIAL NOT NULL,
    "ferryScheduleId" INTEGER NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "vehicles" INTEGER NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "operatorRef" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ferry_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ferry_schedules_departurePortId_arrivalPortId_departureTime_idx" ON "ferry_schedules"("departurePortId", "arrivalPortId", "departureTime");

-- CreateIndex
CREATE INDEX "ferry_schedules_operator_idx" ON "ferry_schedules"("operator");

-- CreateIndex
CREATE INDEX "ferry_schedules_status_idx" ON "ferry_schedules"("status");

-- CreateIndex
CREATE INDEX "ferry_schedules_departureTime_idx" ON "ferry_schedules"("departureTime");

-- CreateIndex
CREATE INDEX "ferry_bookings_ferryScheduleId_idx" ON "ferry_bookings"("ferryScheduleId");

-- CreateIndex
CREATE INDEX "ferry_bookings_bookingId_idx" ON "ferry_bookings"("bookingId");

-- AddForeignKey
ALTER TABLE "ferry_schedules" ADD CONSTRAINT "ferry_schedules_transportServiceId_fkey" FOREIGN KEY ("transportServiceId") REFERENCES "transport_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferry_schedules" ADD CONSTRAINT "ferry_schedules_departurePortId_fkey" FOREIGN KEY ("departurePortId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferry_schedules" ADD CONSTRAINT "ferry_schedules_arrivalPortId_fkey" FOREIGN KEY ("arrivalPortId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferry_bookings" ADD CONSTRAINT "ferry_bookings_ferryScheduleId_fkey" FOREIGN KEY ("ferryScheduleId") REFERENCES "ferry_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferry_bookings" ADD CONSTRAINT "ferry_bookings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
