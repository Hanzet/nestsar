import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 10;

// Campos que se devuelven al cliente. Nunca incluye `password`.
const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  roleId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Usado por AuthService.register (la contraseña ya llega hasheada).
  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async createUser(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    try {
      return await this.prisma.user.create({
        data: { ...dto, password: hashedPassword },
        select: publicUserSelect,
      });
    } catch (error) {
      this.throwIfUniqueViolation(error);
      throw error;
    }
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: Prisma.UserUncheckedUpdateInput = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: publicUserSelect,
      });
    } catch (error) {
      this.throwIfUniqueViolation(error);
      throw error;
    }
  }

  async removeUser(id: number) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
      select: publicUserSelect,
    });
  }

  // Prisma P2002 = violación de restricción única (email duplicado).
  private throwIfUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email already registered');
    }
  }
}
