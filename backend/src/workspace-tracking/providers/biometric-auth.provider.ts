import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class BiometricAuthProvider {
  private challenges: Map<string, { challenge: string; expiresAt: Date }> =
    new Map();

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  generateRegistrationChallenge(userId: string): { challenge: string } {
    const challenge = crypto.randomBytes(32).toString('base64url');
    this.challenges.set(`reg:${userId}`, {
      challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    return { challenge };
  }

  async verifyRegistration(
    userId: string,
    response: {
      challenge: string;
      credentialId: string;
      credentialPublicKey: string;
    },
  ): Promise<{ message: string }> {
    const key = `reg:${userId}`;
    const stored = this.challenges.get(key);
    if (!stored || stored.challenge !== response.challenge) {
      throw new BadRequestException('Invalid or expired challenge');
    }
    if (new Date() > stored.expiresAt) {
      this.challenges.delete(key);
      throw new BadRequestException('Challenge has expired');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.credentialId = response.credentialId;
    user.credentialPublicKey = response.credentialPublicKey;
    await this.usersRepository.save(user);
    this.challenges.delete(key);

    return { message: 'Biometric credential registered successfully' };
  }

  async generateAuthenticationChallenge(
    userId: string,
  ): Promise<{ challenge: string; credentialId: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user || !user.credentialId) {
      throw new BadRequestException('No biometric credential registered');
    }

    const challenge = crypto.randomBytes(32).toString('base64url');
    this.challenges.set(`auth:${userId}`, {
      challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return { challenge, credentialId: user.credentialId };
  }

  async verifyAuthentication(
    userId: string,
    response: { challenge: string; credentialId: string },
  ): Promise<void> {
    const key = `auth:${userId}`;
    const stored = this.challenges.get(key);
    if (!stored || stored.challenge !== response.challenge) {
      throw new BadRequestException('Invalid or expired challenge');
    }
    if (new Date() > stored.expiresAt) {
      this.challenges.delete(key);
      throw new BadRequestException('Challenge has expired');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user || user.credentialId !== response.credentialId) {
      throw new BadRequestException('Invalid credential');
    }

    this.challenges.delete(key);
  }

  async validateCredential(
    userId: string,
    credentialId: string,
  ): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, credentialId },
    });
    return user ?? null;
  }
}
