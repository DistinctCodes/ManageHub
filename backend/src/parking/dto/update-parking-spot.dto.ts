import { PartialType } from '@nestjs/swagger';
import { CreateParkingSpotDto } from './create-parking-spot.dto';
export class UpdateParkingSpotDto extends PartialType(CreateParkingSpotDto) {}