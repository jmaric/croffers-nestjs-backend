-- CreateEnum
CREATE TYPE "CrowdLevel" AS ENUM ('EMPTY', 'QUIET', 'MODERATE', 'BUSY', 'VERY_BUSY');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('GOOGLE_LIVE', 'GOOGLE_HISTORIC', 'INSTAGRAM', 'TIKTOK', 'WEATHER', 'EVENT', 'SENSOR_WIFI', 'SENSOR_BLE', 'SENSOR_CAMERA', 'MANUAL');

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "crowdCapacity" INTEGER;

-- CreateTable
CREATE TABLE "crowd_data_points" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "crowdIndex" DOUBLE PRECISION NOT NULL,
    "crowdLevel" "CrowdLevel" NOT NULL,
    "googleLiveScore" DOUBLE PRECISION,
    "googleHistoricScore" DOUBLE PRECISION,
    "instagramScore" DOUBLE PRECISION,
    "tiktokScore" DOUBLE PRECISION,
    "weatherScore" DOUBLE PRECISION,
    "eventScore" DOUBLE PRECISION,
    "sensorScore" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPrediction" BOOLEAN NOT NULL DEFAULT false,
    "predictionFor" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "weatherCondition" TEXT,
    "activeEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crowd_data_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_trends" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "storyCount" INTEGER NOT NULL DEFAULT 0,
    "hashtagVelocity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hourOfDay" INTEGER NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_snapshots" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "feelsLike" DOUBLE PRECISION,
    "humidity" INTEGER,
    "uvIndex" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "cloudCover" INTEGER,
    "precipitation" DOUBLE PRECISION,
    "weatherCondition" TEXT NOT NULL,
    "waveHeight" DOUBLE PRECISION,
    "seaTemperature" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forecastFor" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'openweathermap',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "sensorType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "macAddress" TEXT,
    "ipAddress" TEXT,
    "capacity" INTEGER,
    "threshold" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "calibrationFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "lastCalibrated" TIMESTAMP(3),
    "installDate" TIMESTAMP(3),
    "location" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" SERIAL NOT NULL,
    "sensorId" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "rawValue" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crowd_predictions" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "predictedIndex" DOUBLE PRECISION NOT NULL,
    "predictedLevel" "CrowdLevel" NOT NULL,
    "predictionFor" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT,
    "historicalPattern" DOUBLE PRECISION,
    "weatherImpact" DOUBLE PRECISION,
    "eventImpact" DOUBLE PRECISION,
    "trendImpact" DOUBLE PRECISION,
    "isBestTime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crowd_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredUntil" TIMESTAMP(3),
    "monthlyFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cpcBid" DECIMAL(65,30),
    "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "hasAPI" BOOLEAN NOT NULL DEFAULT false,
    "alertThreshold" DOUBLE PRECISION,
    "notifyOnQuiet" BOOLEAN NOT NULL DEFAULT false,
    "dashboardData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crowd_alerts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION,
    "isTriggered" BOOLEAN NOT NULL DEFAULT false,
    "triggeredAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crowd_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crowd_data_points_locationId_timestamp_idx" ON "crowd_data_points"("locationId", "timestamp");

-- CreateIndex
CREATE INDEX "crowd_data_points_locationId_isPrediction_predictionFor_idx" ON "crowd_data_points"("locationId", "isPrediction", "predictionFor");

-- CreateIndex
CREATE INDEX "crowd_data_points_crowdLevel_idx" ON "crowd_data_points"("crowdLevel");

-- CreateIndex
CREATE INDEX "crowd_data_points_timestamp_idx" ON "crowd_data_points"("timestamp");

-- CreateIndex
CREATE INDEX "social_trends_locationId_platform_timestamp_idx" ON "social_trends"("locationId", "platform", "timestamp");

-- CreateIndex
CREATE INDEX "weather_snapshots_locationId_timestamp_idx" ON "weather_snapshots"("locationId", "timestamp");

-- CreateIndex
CREATE INDEX "weather_snapshots_locationId_forecastFor_idx" ON "weather_snapshots"("locationId", "forecastFor");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_macAddress_key" ON "sensors"("macAddress");

-- CreateIndex
CREATE INDEX "sensors_locationId_isActive_idx" ON "sensors"("locationId", "isActive");

-- CreateIndex
CREATE INDEX "sensors_sensorType_idx" ON "sensors"("sensorType");

-- CreateIndex
CREATE INDEX "sensor_readings_sensorId_timestamp_idx" ON "sensor_readings"("sensorId", "timestamp");

-- CreateIndex
CREATE INDEX "crowd_predictions_locationId_predictionFor_idx" ON "crowd_predictions"("locationId", "predictionFor");

-- CreateIndex
CREATE INDEX "crowd_predictions_predictionFor_idx" ON "crowd_predictions"("predictionFor");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_supplierId_key" ON "business_profiles"("supplierId");

-- CreateIndex
CREATE INDEX "business_profiles_locationId_isFeatured_idx" ON "business_profiles"("locationId", "isFeatured");

-- CreateIndex
CREATE INDEX "business_profiles_tier_idx" ON "business_profiles"("tier");

-- CreateIndex
CREATE INDEX "crowd_alerts_userId_isActive_idx" ON "crowd_alerts"("userId", "isActive");

-- CreateIndex
CREATE INDEX "crowd_alerts_locationId_isTriggered_idx" ON "crowd_alerts"("locationId", "isTriggered");

-- AddForeignKey
ALTER TABLE "crowd_data_points" ADD CONSTRAINT "crowd_data_points_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_trends" ADD CONSTRAINT "social_trends_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_snapshots" ADD CONSTRAINT "weather_snapshots_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crowd_predictions" ADD CONSTRAINT "crowd_predictions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crowd_alerts" ADD CONSTRAINT "crowd_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crowd_alerts" ADD CONSTRAINT "crowd_alerts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
