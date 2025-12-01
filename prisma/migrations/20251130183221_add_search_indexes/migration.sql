-- CreateIndex
CREATE INDEX "booking_items_serviceId_idx" ON "booking_items"("serviceId");

-- CreateIndex
CREATE INDEX "booking_items_bookingId_idx" ON "booking_items"("bookingId");

-- CreateIndex
CREATE INDEX "bookings_serviceDate_status_idx" ON "bookings"("serviceDate", "status");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "bookings_supplierId_idx" ON "bookings"("supplierId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- CreateIndex
CREATE INDEX "locations_isActive_idx" ON "locations"("isActive");

-- CreateIndex
CREATE INDEX "reviews_serviceId_isPublished_idx" ON "reviews"("serviceId", "isPublished");

-- CreateIndex
CREATE INDEX "reviews_supplierId_isPublished_idx" ON "reviews"("supplierId", "isPublished");

-- CreateIndex
CREATE INDEX "reviews_reviewType_idx" ON "reviews"("reviewType");

-- CreateIndex
CREATE INDEX "reviews_publishAt_idx" ON "reviews"("publishAt");

-- CreateIndex
CREATE INDEX "services_name_idx" ON "services"("name");

-- CreateIndex
CREATE INDEX "services_type_idx" ON "services"("type");

-- CreateIndex
CREATE INDEX "services_status_idx" ON "services"("status");

-- CreateIndex
CREATE INDEX "services_isActive_idx" ON "services"("isActive");

-- CreateIndex
CREATE INDEX "services_price_idx" ON "services"("price");

-- CreateIndex
CREATE INDEX "services_capacity_idx" ON "services"("capacity");

-- CreateIndex
CREATE INDEX "services_createdAt_idx" ON "services"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "services_supplierId_idx" ON "services"("supplierId");

-- CreateIndex
CREATE INDEX "services_type_status_isActive_idx" ON "services"("type", "status", "isActive");

-- CreateIndex
CREATE INDEX "services_price_type_idx" ON "services"("price", "type");
