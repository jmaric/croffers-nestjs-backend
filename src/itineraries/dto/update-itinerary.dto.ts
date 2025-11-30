import { PartialType } from '@nestjs/swagger';
import { CreateItineraryDto } from './create-itinerary.dto.js';

export class UpdateItineraryDto extends PartialType(CreateItineraryDto) {}
