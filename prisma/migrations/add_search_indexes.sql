-- Add indexes for service search and filtering optimization

-- Service table indexes
CREATE INDEX IF NOT EXISTS "services_name_idx" ON "services"("name");
CREATE INDEX IF NOT EXISTS "services_type_idx" ON "services"("type");
CREATE INDEX IF NOT EXISTS "services_status_idx" ON "services"("status");
CREATE INDEX IF NOT EXISTS "services_isActive_idx" ON "services"("isActive");
CREATE INDEX IF NOT EXISTS "services_price_idx" ON "services"("price");
CREATE INDEX IF NOT EXISTS "services_capacity_idx" ON "services"("capacity");
CREATE INDEX IF NOT EXISTS "services_createdAt_idx" ON "services"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "services_supplierId_idx" ON "services"("supplierId");

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS "services_type_status_active_idx" ON "services"("type", "status", "isActive");
CREATE INDEX IF NOT EXISTS "services_price_range_idx" ON "services"("price", "type");

-- Location table indexes for geo queries
CREATE INDEX IF NOT EXISTS "locations_lat_lng_idx" ON "locations"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "locations_type_idx" ON "locations"("type");
CREATE INDEX IF NOT EXISTS "locations_isActive_idx" ON "locations"("isActive");

-- Review table indexes for trust score calculations
CREATE INDEX IF NOT EXISTS "reviews_serviceId_published_idx" ON "reviews"("serviceId", "isPublished");
CREATE INDEX IF NOT EXISTS "reviews_supplierId_published_idx" ON "reviews"("supplierId", "isPublished");
CREATE INDEX IF NOT EXISTS "reviews_reviewType_idx" ON "reviews"("reviewType");
CREATE INDEX IF NOT EXISTS "reviews_publishAt_idx" ON "reviews"("publishAt");

-- Booking items index for popularity sorting
CREATE INDEX IF NOT EXISTS "booking_items_serviceId_idx" ON "booking_items"("serviceId");

-- Booking index for availability checking
CREATE INDEX IF NOT EXISTS "bookings_serviceDate_status_idx" ON "bookings"("serviceDate", "status");
