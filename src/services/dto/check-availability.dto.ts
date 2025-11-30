import { IsNotEmpty, IsDateString, IsInt, Min } from 'class-validator';

export class CheckAvailabilityDto {
  @IsInt()
  @IsNotEmpty()
  serviceId: number;

  @IsDateString()
  @IsNotEmpty()
  date: string; // Service date (e.g., "2024-03-15")

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}