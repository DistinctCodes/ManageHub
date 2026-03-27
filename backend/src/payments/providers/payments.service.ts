import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Payment } from "../entities/payment.entity";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  // Stub methods — to be implemented later
  async findAll(): Promise<Payment[]> {
    return this.paymentRepo.find({ relations: ["user", "booking"] });
  }

  async findOne(id: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { id }, relations: ["user", "booking"] });
  }
}
