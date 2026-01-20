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
var PaystackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const https = require("https");
let PaystackService = PaystackService_1 = class PaystackService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(PaystackService_1.name);
        this.secretKey = this.configService.get('PAYSTACK_SECRET_KEY');
    }
    async initializeTransaction(email, amount, reference, metadata) {
        const params = JSON.stringify({
            email,
            amount: amount * 100,
            reference,
            metadata,
            callback_url: `${this.configService.get('FRONTEND_URL')}/onboarding/payment/verify`,
        });
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/transaction/initialize',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(params),
            },
        };
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.status) {
                            this.logger.log(`Transaction initialized: ${reference}`);
                            resolve(response);
                        }
                        else {
                            this.logger.error(`Paystack initialization failed: ${response.message}`);
                            reject(new Error(response.message));
                        }
                    }
                    catch (error) {
                        this.logger.error('Error parsing Paystack response:', error);
                        reject(error);
                    }
                });
            });
            req.on('error', (error) => {
                this.logger.error('Paystack request error:', error);
                reject(error);
            });
            req.write(params);
            req.end();
        });
    }
    async verifyTransaction(reference) {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/transaction/verify/${reference}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
            },
        };
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.status) {
                            this.logger.log(`Transaction verified: ${reference}`);
                            resolve(response);
                        }
                        else {
                            this.logger.error(`Paystack verification failed: ${response.message}`);
                            reject(new Error(response.message));
                        }
                    }
                    catch (error) {
                        this.logger.error('Error parsing Paystack response:', error);
                        reject(error);
                    }
                });
            });
            req.on('error', (error) => {
                this.logger.error('Paystack request error:', error);
                reject(error);
            });
            req.end();
        });
    }
};
exports.PaystackService = PaystackService;
exports.PaystackService = PaystackService = PaystackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PaystackService);
//# sourceMappingURL=paystack.service.js.map