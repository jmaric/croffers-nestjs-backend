import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotosService } from './photos.service.js';
import {
  CreatePhotoDto,
  UpdatePhotoDto,
  FilterPhotoDto,
  UploadPhotoDto,
} from './dto/index.js';
import { JwtGuard } from '../guard/index.js';
import { RolesGuard } from '../guard/roles.guard.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { UserRole } from '../../generated/prisma/client/client.js';

@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @UseGuards(JwtGuard)
  create(
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() createPhotoDto: CreatePhotoDto,
  ) {
    return this.photosService.create(userId, userRole, createPhotoDto);
  }

  @Post('upload')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadPhotoDto: UploadPhotoDto,
  ) {
    return this.photosService.uploadPhoto(userId, userRole, file, uploadPhotoDto);
  }

  @Get()
  findAll(@Query() filterDto: FilterPhotoDto) {
    return this.photosService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.photosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
    @Body() updatePhotoDto: UpdatePhotoDto,
  ) {
    return this.photosService.update(id, userId, userRole, updatePhotoDto);
  }

  @Patch(':id/set-main')
  @UseGuards(JwtGuard)
  setAsMain(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
  ) {
    return this.photosService.setAsMain(id, userId, userRole);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: UserRole,
  ) {
    return this.photosService.remove(id, userId, userRole);
  }
}