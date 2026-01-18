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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const user_entity_1 = require("../entities/user.entity");
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3, { message: 'Full name must be at least 3 characters' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Full name is too long' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z\s]+$/, {
        message: 'Full name can only contain letters and spaces',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Invalid email address' }),
    (0, class_transformer_1.Transform)(({ value }) => value.toLowerCase()),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(\+234|0)[789][01]\d{8}$/, {
        message: 'Invalid Nigerian phone number',
    }),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value.startsWith('0')) {
            return '+234' + value.slice(1);
        }
        return value;
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password is too long' }),
    (0, class_validator_1.Matches)(/[A-Z]/, {
        message: 'Password must contain at least one uppercase letter',
    }),
    (0, class_validator_1.Matches)(/[a-z]/, {
        message: 'Password must contain at least one lowercase letter',
    }),
    (0, class_validator_1.Matches)(/[0-9]/, {
        message: 'Password must contain at least one number',
    }),
    (0, class_validator_1.Matches)(/[@$!%*?&#]/, {
        message: 'Password must contain at least one special character',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(user_entity_1.MembershipType, { message: 'Invalid membership type' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "membershipType", void 0);
//# sourceMappingURL=register.dto.js.map