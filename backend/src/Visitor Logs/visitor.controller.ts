import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  ValidationPipe,
} from "@nestjs/common";
import { VisitorService } from "./visitor.service";
import {
  CreateVisitorDto,
  UpdateVisitorDto,
  SearchVisitorDto,
} from "./visitor.dto";

@Controller("visitors")
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Post()
  async create(@Body(ValidationPipe) createVisitorDto: CreateVisitorDto) {
    return {
      statusCode: HttpStatus.CREATED,
      message: "Visitor registered successfully",
      data: await this.visitorService.create(createVisitorDto),
    };
  }

  @Get()
  async findAll() {
    return {
      statusCode: HttpStatus.OK,
      message: "Visitors retrieved successfully",
      data: await this.visitorService.findAll(),
    };
  }

  @Get("search")
  async search(@Query(ValidationPipe) searchDto: SearchVisitorDto) {
    return {
      statusCode: HttpStatus.OK,
      message: "Search completed successfully",
      data: await this.visitorService.search(searchDto),
    };
  }

  @Get("active")
  async getActiveVisitors() {
    return {
      statusCode: HttpStatus.OK,
      message: "Active visitors retrieved successfully",
      data: await this.visitorService.getActiveVisitors(),
    };
  }

  @Get("stats")
  async getStats() {
    return {
      statusCode: HttpStatus.OK,
      message: "Statistics retrieved successfully",
      data: await this.visitorService.getVisitorStats(),
    };
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return {
      statusCode: HttpStatus.OK,
      message: "Visitor retrieved successfully",
      data: await this.visitorService.findOne(id),
    };
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body(ValidationPipe) updateVisitorDto: UpdateVisitorDto
  ) {
    return {
      statusCode: HttpStatus.OK,
      message: "Visitor updated successfully",
      data: await this.visitorService.update(id, updateVisitorDto),
    };
  }

  @Patch(":id/checkout")
  async checkOut(@Param("id", ParseIntPipe) id: number) {
    return {
      statusCode: HttpStatus.OK,
      message: "Visitor checked out successfully",
      data: await this.visitorService.checkOut(id),
    };
  }

  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.visitorService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: "Visitor deleted successfully",
    };
  }
}
