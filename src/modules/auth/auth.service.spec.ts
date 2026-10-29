import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'create' | 'findByEmail' | 'findById'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const storedUser = {
    id: 1,
    email: 'ana@example.com',
    password: '',
    name: 'Ana',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('stores a hashed password and never returns it', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(async (data) => ({
        ...storedUser,
        email: data.email as string,
        password: data.password as string,
      }));

      const result = await service.register({
        email: 'ana@example.com',
        password: 'password123',
      });

      const createdData = usersService.create.mock.calls[0][0] as {
        password: string;
      };
      expect(createdData.password).not.toBe('password123');
      expect(await bcrypt.compare('password123', createdData.password)).toBe(
        true,
      );
      expect(result).not.toHaveProperty('password');
    });

    it('throws ConflictException when the email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(storedUser);

      await expect(
        service.register({ email: 'ana@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns an access token when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersService.findByEmail.mockResolvedValue({
        ...storedUser,
        password: hashedPassword,
      });

      const result = await service.login({
        email: 'ana@example.com',
        password: 'password123',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 1,
        email: 'ana@example.com',
      });
      expect(result).toEqual({ accessToken: 'signed-token' });
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersService.findByEmail.mockResolvedValue({
        ...storedUser,
        password: hashedPassword,
      });

      await expect(
        service.login({ email: 'ana@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
