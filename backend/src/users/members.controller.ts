import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {}
