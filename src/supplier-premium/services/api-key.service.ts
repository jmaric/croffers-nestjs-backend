import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyResponseDto,
  ApiKeyCreatedResponseDto,
} from '../dto/api-key.dto.js';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { SupplierAddonType } from '../../../generated/prisma/client/client.js';
import { SupplierAddonService } from './supplier-addon.service.js';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly addonService: SupplierAddonService,
  ) {}

  /**
   * Generate a new API key
   */
  private generateApiKey(): string {
    const randomBytes = crypto.randomBytes(32);
    return `sk_live_${randomBytes.toString('hex')}`;
  }

  /**
   * Create new API key
   */
  async createApiKey(
    dto: CreateApiKeyDto,
    supplierId: number,
  ): Promise<ApiKeyCreatedResponseDto> {
    this.logger.log(`Creating API key for supplier ${supplierId}`);

    // Check if supplier has API Access add-on
    const hasApiAccess = await this.addonService.hasAddon(
      supplierId,
      SupplierAddonType.API_ACCESS,
    );

    if (!hasApiAccess) {
      throw new ForbiddenException(
        'API Access add-on required. Subscribe to API Access (€49/month) to create API keys.',
      );
    }

    // Generate API key
    const apiKey = this.generateApiKey();
    const keyHash = await bcrypt.hash(apiKey, 10);
    const keyPreview = `****${apiKey.slice(-8)}`;

    // Create key record
    const key = await this.prisma.supplierApiKey.create({
      data: {
        supplierId,
        name: dto.name,
        keyHash,
        keyPreview,
        isActive: true,
        scopes: dto.scopes || ['bookings:read', 'services:read'],
        rateLimit: dto.rateLimit || 1000,
      },
    });

    this.logger.log(`API key created: ${key.id} for supplier ${supplierId}`);

    return {
      ...this.mapToResponseDto(key),
      apiKey, // Only returned once!
    };
  }

  /**
   * Get all API keys for supplier
   */
  async getSupplierApiKeys(supplierId: number): Promise<ApiKeyResponseDto[]> {
    const keys = await this.prisma.supplierApiKey.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((key) => this.mapToResponseDto(key));
  }

  /**
   * Get single API key
   */
  async getApiKey(keyId: number, supplierId: number): Promise<ApiKeyResponseDto> {
    const key = await this.prisma.supplierApiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    if (key.supplierId !== supplierId) {
      throw new ForbiddenException('You can only access your own API keys');
    }

    return this.mapToResponseDto(key);
  }

  /**
   * Update API key
   */
  async updateApiKey(
    keyId: number,
    dto: UpdateApiKeyDto,
    supplierId: number,
  ): Promise<ApiKeyResponseDto> {
    const key = await this.prisma.supplierApiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    if (key.supplierId !== supplierId) {
      throw new ForbiddenException('You can only update your own API keys');
    }

    const updated = await this.prisma.supplierApiKey.update({
      where: { id: keyId },
      data: {
        name: dto.name,
        scopes: dto.scopes,
        rateLimit: dto.rateLimit,
        isActive: dto.isActive,
      },
    });

    this.logger.log(`API key ${keyId} updated`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete API key
   */
  async deleteApiKey(keyId: number, supplierId: number) {
    const key = await this.prisma.supplierApiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    if (key.supplierId !== supplierId) {
      throw new ForbiddenException('You can only delete your own API keys');
    }

    await this.prisma.supplierApiKey.delete({
      where: { id: keyId },
    });

    this.logger.log(`API key ${keyId} deleted`);

    return { success: true };
  }

  /**
   * Validate API key and return supplier
   */
  async validateApiKey(apiKey: string): Promise<{ supplierId: number; scopes: string[] }> {
    // Find all active keys
    const keys = await this.prisma.supplierApiKey.findMany({
      where: { isActive: true },
    });

    // Check each key hash
    for (const key of keys) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);

      if (isValid) {
        // Check if expired
        if (key.expiresAt && key.expiresAt < new Date()) {
          throw new ForbiddenException('API key has expired');
        }

        // Update last used timestamp
        await this.prisma.supplierApiKey.update({
          where: { id: key.id },
          data: {
            lastUsedAt: new Date(),
            requestCount: { increment: 1 },
          },
        });

        // Check rate limit (simplified - should use Redis in production)
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (key.lastUsedAt && key.lastUsedAt > hourAgo && key.requestCount >= key.rateLimit) {
          throw new ForbiddenException(
            `Rate limit exceeded. Limit: ${key.rateLimit} requests/hour`,
          );
        }

        return {
          supplierId: key.supplierId,
          scopes: key.scopes,
        };
      }
    }

    throw new ForbiddenException('Invalid API key');
  }

  /**
   * Check if API key has required scope
   */
  hasScope(scopes: string[], requiredScope: string): boolean {
    return scopes.includes(requiredScope) || scopes.includes('*');
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(key: any): ApiKeyResponseDto {
    return {
      id: key.id,
      name: key.name,
      keyPreview: key.keyPreview,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      requestCount: key.requestCount,
      rateLimit: key.rateLimit,
      scopes: key.scopes,
      createdAt: key.createdAt,
    };
  }
}
