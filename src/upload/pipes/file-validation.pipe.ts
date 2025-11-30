import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(
    private readonly maxSize: number = 10 * 1024 * 1024, // 10MB default
    private readonly allowedMimeTypes: string[] = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
  ) {}

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    if (file.size > this.maxSize) {
      throw new BadRequestException(
        `File size must be less than ${this.maxSize / 1024 / 1024}MB`,
      );
    }

    // Validate mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    return file;
  }
}

@Injectable()
export class FilesValidationPipe implements PipeTransform {
  constructor(
    private readonly maxSize: number = 10 * 1024 * 1024, // 10MB default
    private readonly allowedMimeTypes: string[] = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
    private readonly maxFiles: number = 10,
  ) {}

  transform(files: Express.Multer.File[]): Express.Multer.File[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Validate number of files
    if (files.length > this.maxFiles) {
      throw new BadRequestException(
        `Maximum ${this.maxFiles} files allowed`,
      );
    }

    // Validate each file
    files.forEach((file, index) => {
      if (file.size > this.maxSize) {
        throw new BadRequestException(
          `File ${index + 1} size must be less than ${this.maxSize / 1024 / 1024}MB`,
        );
      }

      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File ${index + 1} has invalid type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
        );
      }
    });

    return files;
  }
}

@Injectable()
export class ImageValidationPipe implements PipeTransform {
  constructor(
    private readonly maxSize: number = 5 * 1024 * 1024, // 5MB for images
  ) {}

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No image provided');
    }

    const allowedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid image type. Only JPEG, PNG, WebP, and GIF are allowed',
      );
    }

    if (file.size > this.maxSize) {
      throw new BadRequestException(
        `Image size must be less than ${this.maxSize / 1024 / 1024}MB`,
      );
    }

    return file;
  }
}
