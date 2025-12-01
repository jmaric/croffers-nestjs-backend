import { ConfigService } from '@nestjs/config';

export interface StorageConfig {
  provider: 's3' | 'cloudinary' | 'local';
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
}

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export const getStorageConfig = (
  configService: ConfigService,
): StorageConfig => {
  return {
    provider: configService.get<'s3' | 'cloudinary' | 'local'>(
      'STORAGE_PROVIDER',
      'local',
    ),
    maxFileSize: configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB default
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  };
};

export const getS3Config = (configService: ConfigService): S3Config => {
  return {
    accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID', ''),
    secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
    region: configService.get<string>('AWS_REGION', 'us-east-1'),
    bucket: configService.get<string>('AWS_S3_BUCKET', ''),
  };
};

export const getCloudinaryConfig = (
  configService: ConfigService,
): CloudinaryConfig => {
  return {
    cloudName: configService.get<string>('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: configService.get<string>('CLOUDINARY_API_KEY', ''),
    apiSecret: configService.get<string>('CLOUDINARY_API_SECRET', ''),
  };
};
