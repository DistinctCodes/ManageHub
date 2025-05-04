import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { SpacesController } from "./spaces.controller"
import { SpacesService } from "./spaces.service"
import { Workspace } from "./entities/workspace.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Workspace])],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
