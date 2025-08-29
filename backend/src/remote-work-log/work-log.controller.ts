import { Controller, Get, Post, Body, Param, Patch, Delete } from "@nestjs/common";
import { WorkLogService } from "./work-log.service";
import { CreateWorkLogDto } from "./dto/create-work-log.dto";
import { UpdateWorkLogDto } from "./dto/update-work-log.dto";

@Controller("work-logs")
export class WorkLogController {
  constructor(private readonly workLogService: WorkLogService) {}

  @Post()
  create(@Body() dto: CreateWorkLogDto) {
    return this.workLogService.create(dto);
  }

  @Get()
  findAll() {
    return this.workLogService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.workLogService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateWorkLogDto) {
    return this.workLogService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.workLogService.remove(id);
  }
}
