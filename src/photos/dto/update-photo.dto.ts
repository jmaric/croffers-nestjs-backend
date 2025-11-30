import { PartialType } from '@nestjs/mapped-types';
import { CreatePhotoDto } from './create-photo.dto.js';

export class UpdatePhotoDto extends PartialType(CreatePhotoDto) {}