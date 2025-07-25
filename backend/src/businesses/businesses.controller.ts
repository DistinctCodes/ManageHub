import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { Business } from './entities/business.entity';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  create(@Body() createBusinessDto: CreateBusinessDto): Promise<Business> {
    return this.businessesService.create(createBusinessDto);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('active') active?: string,
  ): Promise<Business[]> {
    if (category) {
      return this.businessesService.findByCategory(category);
    }
    if (active === 'true') {
      return this.businessesService.findActive();
    }
    return this.businessesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Business> {
    return this.businessesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ): Promise<Business> {
    return this.businessesService.update(id, updateBusinessDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.businessesService.remove(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string): Promise<Business> {
    return this.businessesService.deactivate(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string): Promise<Business> {
    return this.businessesService.activate(id);
  }
}
