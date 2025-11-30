import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadService, UploadResult } from './upload.service.js';
import { ImageValidationPipe } from './pipes/file-validation.pipe.js';
import { JwtGuard } from '../auth/guard/jwt.guard.js';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      example: {
        url: 'https://example.com/file.jpg',
        key: 'uploads/12345-file.jpg',
        provider: 's3',
        size: 123456,
        mimeType: 'image/jpeg',
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.uploadService.uploadFile(file);
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    schema: {
      example: [
        {
          url: 'https://example.com/file1.jpg',
          key: 'uploads/12345-file1.jpg',
          provider: 's3',
          size: 123456,
          mimeType: 'image/jpeg',
        },
      ],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadResult[]> {
    return this.uploadService.uploadMultipleFiles(files);
  }

  @Post('image')
  @ApiOperation({ summary: 'Upload and optimize an image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        width: {
          type: 'number',
          description: 'Maximum width',
          example: 1920,
        },
        height: {
          type: 'number',
          description: 'Maximum height',
          example: 1080,
        },
        quality: {
          type: 'number',
          description: 'Image quality (1-100)',
          example: 80,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded and optimized successfully',
  })
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile(new ImageValidationPipe()) image: Express.Multer.File,
    @Body('width') width?: number,
    @Body('height') height?: number,
    @Body('quality') quality?: number,
  ): Promise<UploadResult> {
    return this.uploadService.optimizeImage(image, {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      quality: quality ? Number(quality) : undefined,
    });
  }

  @Post('service-images')
  @ApiOperation({ summary: 'Upload multiple service images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Service images uploaded successfully',
  })
  @UseInterceptors(FilesInterceptor('images', 5)) // Max 5 images for services
  async uploadServiceImages(
    @UploadedFiles() images: Express.Multer.File[],
  ): Promise<UploadResult[]> {
    // Validate that all files are images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    images.forEach((file) => {
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error('Only image files are allowed');
      }
    });

    // Optimize each image
    const uploadPromises = images.map((image) =>
      this.uploadService.optimizeImage(image, {
        width: 1920,
        height: 1080,
        quality: 85,
      }),
    );

    return Promise.all(uploadPromises);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an uploaded file' })
  @ApiResponse({
    status: 204,
    description: 'File deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async deleteFile(@Param('key') key: string): Promise<void> {
    // Decode the key (in case it was URL encoded)
    const decodedKey = decodeURIComponent(key);
    return this.uploadService.deleteFile(decodedKey);
  }
}
