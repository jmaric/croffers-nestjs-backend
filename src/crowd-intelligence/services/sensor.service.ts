import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  RegisterSensorDto,
  SubmitSensorReadingDto,
  UpdateSensorDto,
} from '../dto/sensor.dto.js';

@Injectable()
export class SensorService {
  private readonly logger = new Logger(SensorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a new sensor
   */
  async registerSensor(dto: RegisterSensorDto) {
    this.logger.log(`Registering new ${dto.sensorType} sensor: ${dto.name}`);

    // Validate sensor type
    const validTypes = ['wifi', 'ble', 'camera'];
    if (!validTypes.includes(dto.sensorType)) {
      throw new BadRequestException(
        `Invalid sensor type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    // Check if MAC address already exists
    if (dto.macAddress) {
      const existing = await this.prisma.sensor.findUnique({
        where: { macAddress: dto.macAddress },
      });

      if (existing) {
        throw new BadRequestException(
          `Sensor with MAC address ${dto.macAddress} already exists`,
        );
      }
    }

    const sensor = await this.prisma.sensor.create({
      data: {
        locationId: dto.locationId,
        sensorType: dto.sensorType,
        name: dto.name,
        macAddress: dto.macAddress,
        ipAddress: dto.ipAddress,
        capacity: dto.capacity,
        threshold: dto.threshold,
        location: dto.location,
        isActive: true,
      },
    });

    this.logger.log(`Sensor registered with ID: ${sensor.id}`);

    return sensor;
  }

  /**
   * Submit sensor reading
   */
  async submitReading(dto: SubmitSensorReadingDto) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: dto.sensorId },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor ${dto.sensorId} not found`);
    }

    if (!sensor.isActive) {
      throw new BadRequestException(`Sensor ${dto.sensorId} is not active`);
    }

    // Apply calibration factor
    const calibratedCount = Math.round(dto.count * sensor.calibrationFactor);

    const reading = await this.prisma.sensorReading.create({
      data: {
        sensorId: dto.sensorId,
        count: calibratedCount,
        rawValue: dto.rawValue,
        confidence: dto.confidence,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      },
    });

    this.logger.debug(
      `Sensor ${sensor.name} reading: ${calibratedCount} (raw: ${dto.count})`,
    );

    return {
      readingId: reading.id,
      calibratedCount,
      timestamp: reading.timestamp,
    };
  }

  /**
   * Get sensor by ID
   */
  async getSensor(id: number) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
      include: {
        locationRelation: {
          select: { id: true, name: true, type: true },
        },
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor ${id} not found`);
    }

    return sensor;
  }

  /**
   * Get all sensors for a location
   */
  async getSensorsByLocation(locationId: number) {
    return this.prisma.sensor.findMany({
      where: { locationId },
      include: {
        readings: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });
  }

  /**
   * Update sensor configuration
   */
  async updateSensor(id: number, dto: UpdateSensorDto) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor ${id} not found`);
    }

    const updated = await this.prisma.sensor.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.calibrationFactor !== undefined && {
          lastCalibrated: new Date(),
        }),
      },
    });

    this.logger.log(`Sensor ${id} updated`);

    return updated;
  }

  /**
   * Delete sensor
   */
  async deleteSensor(id: number) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor ${id} not found`);
    }

    await this.prisma.sensor.delete({
      where: { id },
    });

    this.logger.log(`Sensor ${id} deleted`);
  }

  /**
   * Get sensor statistics
   */
  async getSensorStats(sensorId: number, hours: number = 24) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor ${sensorId} not found`);
    }

    const readings = await this.prisma.sensorReading.findMany({
      where: {
        sensorId,
        timestamp: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000),
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    const counts = readings.map((r) => r.count);
    const avg = counts.length > 0
      ? counts.reduce((a, b) => a + b, 0) / counts.length
      : 0;
    const max = counts.length > 0 ? Math.max(...counts) : 0;
    const min = counts.length > 0 ? Math.min(...counts) : 0;

    return {
      sensorId,
      sensorName: sensor.name,
      period: `${hours}h`,
      totalReadings: readings.length,
      averageCount: Math.round(avg),
      maxCount: max,
      minCount: min,
      utilizationRate: sensor.capacity ? (avg / sensor.capacity) * 100 : null,
      readings: readings.map((r) => ({
        count: r.count,
        timestamp: r.timestamp,
      })),
    };
  }
}
