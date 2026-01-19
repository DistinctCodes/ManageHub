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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const user_entity_1 = require("./entities/user.entity");
const email_service_1 = require("../email/email.service");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
let AuthService = AuthService_1 = class AuthService {
    constructor(userRepository, emailService, jwtService, configService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(AuthService_1.name);
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
    async verifyEmail(verifyEmailDto) {
        const { token } = verifyEmailDto;
        const user = await this.userRepository.findOne({
            where: { emailVerificationToken: token },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired verification token');
        }
        if (user.emailVerified) {
            return {
                success: true,
                message: 'Email already verified',
                data: {
                    email: user.email,
                    verified: true,
                },
            };
        }
        const now = new Date();
        if (!user.emailVerificationExpiry || user.emailVerificationExpiry < now) {
            throw new common_1.BadRequestException('Verification token has expired. Please request a new one.');
        }
        user.emailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpiry = null;
        user.status = user_entity_1.UserStatus.ACTIVE;
        try {
            await this.userRepository.save(user);
            this.emailService.sendWelcomeEmail(user.email, user.fullName);
            return {
                success: true,
                message: 'Email verified successfully',
                data: {
                    email: user.email,
                    verified: true,
                },
            };
        }
        catch (error) {
            console.error('Email verification error:', error);
            throw new common_1.InternalServerErrorException('Failed to verify email. Please try again.');
        }
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.userRepository.findOne({
            where: { email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.emailVerified) {
            throw new common_1.UnauthorizedException('Please verify your email before logging in');
        }
        if (user.status === user_entity_1.UserStatus.SUSPENDED) {
            throw new common_1.UnauthorizedException('Your account has been suspended. Please contact support.');
        }
        if (user.status === user_entity_1.UserStatus.DEACTIVATED) {
            throw new common_1.UnauthorizedException('Your account has been deactivated. Please contact support.');
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);
        const tokens = await this.generateTokens(user);
        return {
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    membershipType: user.membershipType,
                    role: user.role,
                    status: user.status,
                    emailVerified: user.emailVerified,
                    profilePicture: user.profilePicture,
                    stellarWalletAddress: user.stellarWalletAddress,
                },
                tokens,
            },
        };
    }
    async forgotPassword(forgotPasswordDto) {
        const { email } = forgotPasswordDto;
        const user = await this.userRepository.findOne({
            where: { email },
        });
        if (!user) {
            this.logger.warn(`Password reset requested for non-existent email: ${email}`);
            return {
                success: true,
                message: 'If an account exists with this email, you will receive password reset instructions.',
                data: {
                    email,
                    resetEmailSent: false,
                },
            };
        }
        if (!user.emailVerified) {
            throw new common_1.BadRequestException('Please verify your email before resetting password');
        }
        const passwordResetToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const passwordResetExpiry = new Date();
        passwordResetExpiry.setHours(passwordResetExpiry.getHours() + 1);
        user.passwordResetToken = passwordResetToken;
        user.passwordResetExpiry = passwordResetExpiry;
        try {
            await this.userRepository.save(user);
            const resetEmailSent = await this.emailService.sendPasswordResetEmail(email, user.fullName, passwordResetToken);
            this.logger.log(`Password reset token generated for user: ${email}`);
            return {
                success: true,
                message: 'Password reset instructions have been sent to your email',
                data: {
                    email,
                    resetEmailSent,
                },
            };
        }
        catch (error) {
            this.logger.error(`Password reset error for ${email}:`, error);
            throw new common_1.InternalServerErrorException('Failed to process password reset request. Please try again.');
        }
    }
    async resetPassword(resetPasswordDto) {
        const { token, password } = resetPasswordDto;
        this.logger.log(`Password reset attempt with token: ${token.substring(0, 10)}...`);
        const user = await this.userRepository.findOne({
            where: { passwordResetToken: token },
        });
        if (!user) {
            this.logger.warn(`Invalid password reset token: ${token.substring(0, 10)}...`);
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const now = new Date();
        if (!user.passwordResetExpiry || user.passwordResetExpiry < now) {
            this.logger.warn(`Expired password reset token for user: ${user.email}`);
            throw new common_1.BadRequestException('Reset token has expired. Please request a new one.');
        }
        const isSameAsCurrentPassword = await bcrypt.compare(password, user.passwordHash);
        if (isSameAsCurrentPassword) {
            throw new common_1.BadRequestException('New password cannot be the same as your current password');
        }
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(password, saltRounds);
        user.passwordHash = newPasswordHash;
        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        try {
            await this.userRepository.save(user);
            this.logger.log(`Password reset successful for user: ${user.email}`);
            this.emailService
                .sendPasswordChangeConfirmationEmail(user.email, user.fullName)
                .catch((err) => {
                this.logger.error(`Failed to send password change confirmation to ${user.email}:`, err);
            });
            return {
                success: true,
                message: 'Password reset successful',
                data: {
                    email: user.email,
                    passwordChanged: true,
                },
            };
        }
        catch (error) {
            this.logger.error(`Password reset error for ${user.email}:`, error);
            throw new common_1.InternalServerErrorException('Failed to reset password. Please try again.');
        }
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: this.configService.get('JWT_EXPIRATION') || '7d',
        });
        const refreshTokenExpiry = '30d';
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || refreshTokenExpiry,
        });
        return {
            accessToken,
            refreshToken,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        email_service_1.EmailService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map