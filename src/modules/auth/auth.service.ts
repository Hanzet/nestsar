import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Servicio para registro de usuario
  // Ruta de acceso: POST /auth/register
  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    return this.toPublicUser(user);
  }

  // Servicio para manejar el inicio de sesión de un usuario. Verifica las credenciales y genera un token JWT si son válidas.
  // Ruta de acceso: POST /auth/login
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    const passwordMatches =
      user && (await bcrypt.compare(loginDto.password, user.password));

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };

    return { accessToken: await this.jwtService.signAsync(payload) };
  }

  // Servicio para obtener el perfil de un usuario autenticado. Requiere un token JWT válido.
  // Ruta de acceso: GET /auth/profile
  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  private toPublicUser(user: {
    id: number;
    email: string;
    name: string | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
