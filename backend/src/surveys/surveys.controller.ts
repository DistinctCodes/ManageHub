import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto, UpdateSurveyDto } from './dto/survey.dto';
import { CreateSurveyResponseDto } from './dto/response.dto';
import { Survey } from './entities/survey.entity';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  create(@Body() createSurveyDto: CreateSurveyDto): Promise<Survey> {
    return this.surveysService.create(createSurveyDto);
  }

  @Get()
  findAll(@Query('active') active?: string): Promise<Survey[]> {
    const activeOnly = active === 'true';
    return this.surveysService.findAll(activeOnly);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Survey> {
    return this.surveysService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSurveyDto: UpdateSurveyDto,
  ): Promise<Survey> {
    return this.surveysService.update(id, updateSurveyDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.surveysService.remove(id);
  }

  @Post('responses')
  submitResponses(@Body() createResponseDto: CreateSurveyResponseDto): Promise<void> {
    return this.surveysService.submitResponses(createResponseDto);
  }

  @Get(':id/responses')
  getSurveyResponses(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    return this.surveysService.getSurveyResponses(id);
  }
}
