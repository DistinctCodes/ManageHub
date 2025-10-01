import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/createUser.dto';
import { UpdateUserDto } from '../dto/updateUser.dto';
import { User } from '../entities/user.entity';
import { CreateUserProvider } from './createUser.provider';
import { FindOneUserByIdProvider } from './findOneUserById.provider';
import { FindOneUserByEmailProvider } from './findOneUserByEmail.provider';
import { ValidateUserProvider } from './validateUser.provider';
import { FindAllUsersProvider } from './findAllUsers.provider';
import { UpdateUserProvider } from './updateUser.provider';
import { DeleteUserProvider } from './deleteUser.provider';
import { AuthResponse } from 'src/auth/interfaces/authResponse.interface';
import { Response } from 'express';
import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadProfilePictureProvider } from './uploadProfilePicture.provider';
import { UserRole } from '../enums/userRoles.enum';

@Injectable()
export class UsersService {
  constructor(
    private readonly createUserProvider: CreateUserProvider,
    private readonly findOneUserByIdProvider: FindOneUserByIdProvider,
    private readonly findOneUserByEmailProvider: FindOneUserByEmailProvider,
    private readonly validateUserProvider: ValidateUserProvider,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly findAllUsersProvider: FindAllUsersProvider,
    private readonly updateUserProvider: UpdateUserProvider,
    private readonly deleteUserProvider: DeleteUserProvider,

    private readonly uploadProfilePictureProvider: UploadProfilePictureProvider,
  ) {}

  // CREATE USER
  async createUser(
    createUserDto: CreateUserDto,
    response: Response,
  ): Promise<AuthResponse> {
    return await this.createUserProvider.createUser(createUserDto, response);
  }

  // FIND ALL USERS
  async findAllUsers(): Promise<User[]> {
    return await this.findAllUsersProvider.getUsers();
  }

  // FIND USER BY ID
  async findUserById(id: string): Promise<User> {
    return await this.findOneUserByIdProvider.getUser(id);
  }

  // FIND USER BY EMAIL
  async findUserByEmail(email: string): Promise<User> {
    return await this.findOneUserByEmailProvider.getUser(email);
  }

  // UPDATE USER
  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    return await this.updateUserProvider.updateUser(id, updateData);
  }

  // DELETE USER
  async deleteUser(id: string): Promise<void> {
    return await this.deleteUserProvider.deleteUser(id);
  }

  // VALIDATE USER
  async validateUser(
    email: string,
    password: string,
  ): Promise<Partial<User>> {
    return await this.validateUserProvider.validateUser(email, password);
  }

  // UPDATE PROFILE PICTURE (delegates to provider)
  async uploadUserProfilePicture(
    targetUserId: string,
    file: Express.Multer.File,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<{ id: string; profilePicture: string }> {
    return await this.uploadProfilePictureProvider.uploadProfilePicture(
      targetUserId,
      file,
      currentUserId,
      currentUserRole,
    );
  }

  // UPDATE PROFILE PICTURE (legacy save method if needed elsewhere)
  async updateProfilePicture(userId: string, profilePictureUrl: string): Promise<User & { oldProfilePicture?: string }> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const oldProfilePicture = user.profilePicture;
    user.profilePicture = profilePictureUrl;
    const updatedUser = await this.usersRepository.save(user);
    return { ...updatedUser, oldProfilePicture } as User & { oldProfilePicture?: string };
  }

  // FIND ONE BY ID (EXCLUDE PASSWORD) - service-level method for controller
  async findOnePublicById(id: string): Promise<Partial<User>> {
    const user = await this.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }
}
