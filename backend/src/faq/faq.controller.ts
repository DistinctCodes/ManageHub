import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FAQService } from './faq.service';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';
import { FAQQueryDto } from './dto/faq-query.dto';
import { FAQ, FAQCategory } from './faq.entity';

@Controller('faq')
export class FAQController {
  constructor(private readonly faqService: FAQService) {}

  // Admin Endpoints

  @Post('admin')
  async createFAQ(
    @Body(ValidationPipe) createFAQDto: CreateFAQDto,
  ): Promise<{
    statusCode: number;
    message: string;
    data: FAQ;
  }> {
    const faq = await this.faqService.createFAQ(createFAQDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'FAQ created successfully',
      data: faq,
    };
  }

  @Put('admin/:id')
  async updateFAQ(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateFAQDto: UpdateFAQDto,
  ): Promise<{
    statusCode: number;
    message: string;
    data: FAQ;
  }> {
    const faq = await this.faqService.updateFAQ(id, updateFAQDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'FAQ updated successfully',
      data: faq,
    };
  }

  @Delete('admin/:id')
  async deleteFAQ(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    statusCode: number;
    message: string;
  }> {
    await this.faqService.deleteFAQ(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'FAQ deleted successfully',
    };
  }

  @Put('admin/:id/toggle')
  async toggleFAQStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    statusCode: number;
    message: string;
    data: FAQ;
  }> {
    const faq = await this.faqService.toggleFAQStatus(id);

    return {
      statusCode: HttpStatus.OK,
      message: `FAQ ${faq.isActive ? 'activated' : 'deactivated'} successfully`,
      data: faq,
    };
  }

  @Put('admin/bulk/priority')
  async bulkUpdatePriority(
    @Body() updates: Array<{ id: string; priority: number }>,
  ): Promise<{
    statusCode: number;
    message: string;
    data: FAQ[];
  }> {
    const faqs = await this.faqService.bulkUpdatePriority(updates);

    return {
      statusCode: HttpStatus.OK,
      message: 'FAQ priorities updated successfully',
      data: faqs,
    };
  }

  @Get('admin/all')
  async getAllFAQsForAdmin(
    @Query(ValidationPipe) queryDto: FAQQueryDto,
  ): Promise<{
    statusCode: number;
    message: string;
    data: {
      faqs: FAQ[];
      total: number;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    };
  }> {
    // Admin can see all FAQs including inactive ones
    const result = await this.faqService.getAllFAQs({
      ...queryDto,
      isActive: undefined, // Override to show all
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'All FAQs retrieved successfully',
      data: result,
    };
  }

  @Get('admin/stats')
  async getFAQStats(): Promise<{
    statusCode: number;
    message: string;
    data: any;
  }> {
    const stats = await this.faqService.getFAQStats();

    return {
      statusCode: HttpStatus.OK,
      message: 'FAQ statistics retrieved successfully',
      data: stats,
    };
  }

  // Public/User Endpoints

  @Get()
  async getAllFAQs(
    @Query(ValidationPipe) queryDto: FAQQueryDto,
  ): Promise<{
    statusCode: number;
    message: string;
    data: {
      faqs: FAQ[];
      total: number;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    };
  }> {
    const result = await this.faqService.getAllFAQs(queryDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'FAQs retrieved successfully',
      data: result,
    };
  }

  @Get('search')
  async searchFAQs(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number,
  ): Promise<{
    statusCode: number;
    message: string;
    data: FAQ[];
  }> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Search term must be at least 2 characters long',
        data: [],
      };
    }

    const faqs = await this.faqService.searchFAQs(
      searchTerm.trim(),
      limit ? parseInt(limit.toString()) : 10,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'FAQ search completed successfully',
      data: faqs,
    };
  }

  @Get('popular')
  async getPopularFAQs(
    @Query('limit') limit?: number,
  ): Promise<{
    statusCode: number;
    message: string;
    data: FAQ[];
  }> {
    const faqs = await this.faqService.getPopularFAQs(
      limit ? parseInt(limit.toString()) : 10,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Popular FAQs retrieved successfully',
      data: faqs,
    };
  }

  @Get('categories')
  async getCategories(): Promise<{
    statusCode: number;
    message: string;
    data: FAQCategory[];
  }> {
    const categories = await this.faqService.getCategories();

    return {
      statusCode: HttpStatus.OK,
      message: 'FAQ categories retrieved successfully',
      data: categories,
    };
  }

  @Get('category/:category')
  async getFAQsByCategory(
    @Param('category') category: FAQCategory,
    @Query('limit') limit?: number,
  ): Promise<{
    statusCode: number;
    message: string;
    data: FAQ[];
  }> {
    const faqs = await this.faqService.getFAQsByCategory(
      category,
      limit ? parseInt(limit.toString()) : 10,
    );

    return {
      statusCode: HttpStatus.OK,
      message: `FAQs for category '${category}' retrieved successfully`,
      data: faqs,
    };
  }

  @Get(':id')
  async getFAQById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('increment') incrementView?: string,
  ): Promise<{
    statusCode: number;
    message: string;
    data: FAQ;
  }> {
    // If increment query param is present, increment view count
    const shouldIncrement = incrementView === 'true';
    const faq = shouldIncrement
      ? await this.faqService.getFAQByIdWithViewIncrement(id)
      : await this.faqService.getFAQById(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'FAQ retrieved successfully',
      data: faq,
    };
  }
}
