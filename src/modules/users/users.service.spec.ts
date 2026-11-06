import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const publicUser = {
    id: 1,
    email: 'ana@example.com',
    name: 'Ana',
    roleId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('createUser', () => {
    it('hashes the password before saving and never returns it', async () => {
      prisma.user.create.mockResolvedValue(publicUser);

      const result = await service.createUser({
        email: 'ana@example.com',
        password: 'password123',
        name: 'Ana',
      });

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.password).not.toBe('password123');
      expect(await bcrypt.compare('password123', data.password)).toBe(true);
      expect(prisma.user.create.mock.calls[0][0].select).toBeDefined();
      expect(result).not.toHaveProperty('password');
    });

    it('throws ConflictException when the email already exists', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.createUser({ email: 'ana@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('hashes a new password when one is provided', async () => {
      prisma.user.findUnique.mockResolvedValue(publicUser);
      prisma.user.update.mockResolvedValue(publicUser);

      await service.updateUser(1, { password: 'newpassword1' });

      const data = prisma.user.update.mock.calls[0][0].data;
      expect(await bcrypt.compare('newpassword1', data.password)).toBe(true);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUser(99, { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('removeUser', () => {
    it('deletes an existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(publicUser);
      prisma.user.delete.mockResolvedValue(publicUser);

      await expect(service.removeUser(1)).resolves.toEqual(publicUser);
      expect(prisma.user.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });
  });
});
