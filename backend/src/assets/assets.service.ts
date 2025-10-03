import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Asset } from "./assets.entity";

@Injectable()
export class AssetService {
constructor(
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
) {}

async findActive() {
  return this.assetRepo.find({ where: { status: 'active' } });
}
}