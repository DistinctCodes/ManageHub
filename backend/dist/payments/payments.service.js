"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const uuid_1 = require("uuid");
const payment_entity_1 = require("./entities/payment.entity");
const user_entity_1 = require("../auth/entities/user.entity");
const paystack_service_1 = require("./paystack.service");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(paymentRepository, userRepository, paystackService) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.paystackService = paystackService;
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async initializePayment(userId, initializePaymentDto) {
        const { membershipType, paymentPlan, amount } = initializePaymentDto;
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const reference = `MH-${(0, uuid_1.v4)()}`;
        try {
            const paystackResponse = await this.paystackService.initializeTransaction(user.email, amount, reference, {
                user_id: userId,
                membership_type: membershipType,
                payment_plan: paymentPlan,
            });
            const payment = this.paymentRepository.create({
                user: { id: userId },
                reference,
                amount,
                membershipType,
                paymentPlan,
                status: payment_entity_1.PaymentStatus.PENDING,
                paystackReference: paystackResponse.data.reference,
                accessCode: paystackResponse.data.access_code,
                metadata: {
                    membership_type: membershipType,
                    payment_plan: paymentPlan,
                },
            });
            await this.paymentRepository.save(payment);
            this.logger.log(`Payment initialized for user ${userId}: ${reference}`);
            return {
                success: true,
                message: 'Payment initialized successfully',
                data: {
                    authorizationUrl: paystackResponse.data.authorization_url,
                    accessCode: paystackResponse.data.access_code,
                    reference: paystackResponse.data.reference,
                },
            };
        }
        catch (error) {
            this.logger.error(`Payment initialization failed for user ${userId}:`, error);
            throw new common_1.InternalServerErrorException('Failed to initialize payment');
        }
    }
    async verifyPayment(reference) {
        const payment = await this.paymentRepository.findOne({
            where: { paystackReference: reference },
            relations: ['user'],
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.status === payment_entity_1.PaymentStatus.SUCCESS) {
            return {
                success: true,
                message: 'Payment already verified',
                data: {
                    reference: payment.reference,
                    amount: payment.amount,
                    status: payment.status,
                    paidAt: payment.paidAt,
                },
            };
        }
        try {
            const paystackResponse = await this.paystackService.verifyTransaction(reference);
            if (paystackResponse.data.status === 'success') {
                payment.status = payment_entity_1.PaymentStatus.SUCCESS;
                payment.paidAt = new Date(paystackResponse.data.paid_at);
                await this.paymentRepository.save(payment);
                this.logger.log(`Payment verified successfully: ${reference}`);
                return {
                    success: true,
                    message: 'Payment verified successfully',
                    data: {
                        reference: payment.reference,
                        amount: payment.amount,
                        status: payment.status,
                        paidAt: payment.paidAt,
                    },
                };
            }
            else {
                payment.status = payment_entity_1.PaymentStatus.FAILED;
                await this.paymentRepository.save(payment);
                throw new common_1.BadRequestException('Payment verification failed');
            }
        }
        catch (error) {
            this.logger.error(`Payment verification failed for ${reference}:`, error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to verify payment');
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        paystack_service_1.PaystackService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map