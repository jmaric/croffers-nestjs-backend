import { IsNotEmpty, IsString } from 'class-validator';

export class AddDisputeNoteDto {
  @IsNotEmpty()
  @IsString()
  note: string;
}
