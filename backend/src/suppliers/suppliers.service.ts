import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './suppliers.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { Asset } from '../assets/assets.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private suppliersRepository: Repository<Supplier>,
  ) {}

  create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.suppliersRepository.create(createSupplierDto);
    return this.suppliersRepository.save(supplier);
  }

  async findAll(query: QuerySupplierDto): Promise<{ data: Supplier[]; total: number }> {
    const { name, email, page = 1, limit = 10 } = query;
    const qb = this.suppliersRepository.createQueryBuilder('supplier').leftJoinAndSelect('supplier.assets', 'asset');
    if (name) qb.andWhere('supplier.name ILIKE :name', { name: `%${name}%` });
    if (email) qb.andWhere('supplier.email = :email', { email });
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total };
  }

  async toggleStatus(id: number): Promise<Supplier> {
    const supplier = await this.findOne(id);
    supplier.isActive = !supplier.isActive;
    return this.suppliersRepository.save(supplier);
  }
  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({ where: { id }, relations: ['assets'] });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    Object.assign(supplier, updateSupplierDto);
    return this.suppliersRepository.save(supplier);
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.findOne(id);
    await this.suppliersRepository.remove(supplier);
  }

  async assignAsset(supplierId: number, assetId: number): Promise<Supplier> {
    const supplier = await this.findOne(supplierId);
    const assetRepo = this.suppliersRepository.manager.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    asset.supplier = supplier;
    await assetRepo.save(asset);
    return this.findOne(supplierId);
  }

  async unassignAsset(supplierId: number, assetId: number): Promise<Supplier> {
    const supplier = await this.findOne(supplierId);
    const assetRepo = this.suppliersRepository.manager.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id: assetId, supplier: { id: supplierId } } });
    if (!asset) throw new NotFoundException('Asset not found for this supplier');
    asset.supplier = null;
    await assetRepo.save(asset);
    return this.findOne(supplierId);
  }
}
