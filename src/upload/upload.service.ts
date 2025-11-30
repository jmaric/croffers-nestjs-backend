import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import {
  getStorageConfig,
  getS3Config,
  getCloudinaryConfig,
  StorageConfig,
} from './config/storage.config.js';

const unlinkAsync = promisify(fs.unlink);

export interface UploadResult {
  url: string;
  key: string;
  provider: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class UploadService {
  private s3: AWS.S3;
  private storageConfig: StorageConfig;
  private readonly uploadsDir = 'uploads';

  constructor(private readonly configService: ConfigService) {
    this.storageConfig = getStorageConfig(configService);
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const provider = this.storageConfig.provider;

    if (provider === 's3') {
      const s3Config = getS3Config(this.configService);
      this.s3 = new AWS.S3({
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
        region: s3Config.region,
      });
    } else if (provider === 'cloudinary') {
      const cloudinaryConfig = getCloudinaryConfig(this.configService);
      cloudinary.config({
        cloud_name: cloudinaryConfig.cloudName,
        api_key: cloudinaryConfig.apiKey,
        api_secret: cloudinaryConfig.apiSecret,
      });
    } else if (provider === 'local') {
      // Ensure uploads directory exists
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    this.validateFile(file);

    const provider = this.storageConfig.provider;

    switch (provider) {
      case 's3':
        return this.uploadToS3(file);
      case 'cloudinary':
        return this.uploadToCloudinary(file);
      case 'local':
        return this.uploadToLocal(file);
      default:
        throw new BadRequestException('Invalid storage provider');
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.storageConfig.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.storageConfig.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check mime type
    if (!this.storageConfig.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed`,
      );
    }
  }

  private async uploadToS3(file: Express.Multer.File): Promise<UploadResult> {
    const s3Config = getS3Config(this.configService);
    const key = `${Date.now()}-${file.originalname}`;

    try {
      const result = await this.s3
        .upload({
          Bucket: s3Config.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        })
        .promise();

      return {
        url: result.Location,
        key: result.Key,
        provider: 's3',
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload to S3: ${error.message}`,
      );
    }
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    try {
      // Convert buffer to base64 for Cloudinary
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      const result = await cloudinary.uploader.upload(base64File, {
        folder: 'croffers-nest',
        resource_type: 'auto',
      });

      return {
        url: result.secure_url,
        key: result.public_id,
        provider: 'cloudinary',
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload to Cloudinary: ${error.message}`,
      );
    }
  }

  private async uploadToLocal(
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    try {
      const filename = `${Date.now()}-${file.originalname}`;
      const filepath = path.join(this.uploadsDir, filename);

      // Write file to disk
      fs.writeFileSync(filepath, file.buffer);

      const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3333');

      return {
        url: `${baseUrl}/uploads/${filename}`,
        key: filename,
        provider: 'local',
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload locally: ${error.message}`,
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    const provider = this.storageConfig.provider;

    switch (provider) {
      case 's3':
        await this.deleteFromS3(key);
        break;
      case 'cloudinary':
        await this.deleteFromCloudinary(key);
        break;
      case 'local':
        await this.deleteFromLocal(key);
        break;
      default:
        throw new BadRequestException('Invalid storage provider');
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    const s3Config = getS3Config(this.configService);

    try {
      await this.s3
        .deleteObject({
          Bucket: s3Config.bucket,
          Key: key,
        })
        .promise();
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete from S3: ${error.message}`,
      );
    }
  }

  private async deleteFromCloudinary(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete from Cloudinary: ${error.message}`,
      );
    }
  }

  private async deleteFromLocal(filename: string): Promise<void> {
    const filepath = path.join(this.uploadsDir, filename);

    try {
      if (fs.existsSync(filepath)) {
        await unlinkAsync(filepath);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete local file: ${error.message}`,
      );
    }
  }

  async optimizeImage(
    file: Express.Multer.File,
    options?: { width?: number; height?: number; quality?: number },
  ): Promise<UploadResult> {
    const provider = this.storageConfig.provider;

    if (provider === 'cloudinary') {
      return this.optimizeWithCloudinary(file, options);
    }

    // For other providers, just upload normally
    // You could integrate with Sharp for local optimization
    return this.uploadFile(file);
  }

  private async optimizeWithCloudinary(
    file: Express.Multer.File,
    options?: { width?: number; height?: number; quality?: number },
  ): Promise<UploadResult> {
    try {
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      const transformation: any = {
        folder: 'croffers-nest',
        resource_type: 'auto',
        quality: options?.quality || 'auto',
      };

      if (options?.width) {
        transformation.width = options.width;
        transformation.crop = 'limit';
      }

      if (options?.height) {
        transformation.height = options.height;
        transformation.crop = 'limit';
      }

      const result = await cloudinary.uploader.upload(
        base64File,
        transformation,
      );

      return {
        url: result.secure_url,
        key: result.public_id,
        provider: 'cloudinary',
        size: result.bytes,
        mimeType: file.mimetype,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to optimize image: ${error.message}`,
      );
    }
  }
}
