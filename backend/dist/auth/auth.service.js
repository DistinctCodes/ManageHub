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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const user_entity_1 = require("./entities/user.entity");
const email_service_1 = require("../email/email.service");
let AuthService = class AuthService {
    constructor(userRepository, emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
    async register(registerDto) {
        const { email, phone, password, fullName, membershipType } = registerDto;
        const existingUserByEmail = await this.userRepository.findOne({
            where: { email },
        });
        if (existingUserByEmail) {
            throw new common_1.ConflictException('Email already registered');
        }
        const existingUserByPhone = await this.userRepository.findOne({
            where: { phone },
        });
        if (existingUserByPhone) {
            throw new common_1.ConflictException('Phone number already registered');
        }
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const emailVerificationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const emailVerificationExpiry = new Date();
        emailVerificationExpiry.setHours(emailVerificationExpiry.getHours() + 24);
        const user = this.userRepository.create({
            fullName,
            email,
            phone,
            passwordHash,
            membershipType,
            status: user_entity_1.UserStatus.PENDING_VERIFICATION,
            emailVerificationToken,
            emailVerificationExpiry,
        });
        try {
            await this.userRepository.save(user);
            const verificationEmailSent = await this.emailService.sendVerificationEmail(email, fullName, emailVerificationToken);
            return {
                success: true,
                message: 'Registration successful. Please check your email to verify your account.',
                data: {
                    userId: user.id,
                    email: user.email,
                    verificationEmailSent,
                },
            };
        }
        catch (error) {
            console.error('Registration error:', error);
            throw new common_1.InternalServerErrorException('Failed to create account. Please try again.');
        }
    }
    async resendVerificationEmail(email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        if (user.emailVerified) {
            throw new common_1.BadRequestException('Email already verified');
        }
        const emailVerificationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const emailVerificationExpiry = new Date();
        emailVerificationExpiry.setHours(emailVerificationExpiry.getHours() + 24);
        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationExpiry = emailVerificationExpiry;
        await this.userRepository.save(user);
        const sent = await this.emailService.sendVerificationEmail(email, user.fullName, emailVerificationToken);
        return {
            success: true,
            message: 'Verification email sent successfully',
            data: { emailSent: sent },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map