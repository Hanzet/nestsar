# Arquitectura del proyecto

Este documento describe la estructura del proyecto `sar` (NestJS + Prisma + PostgreSQL), las convenciones que seguimos y el modelo de datos actual. Úsalo como referencia al crear módulos nuevos o revisar cambios.

## 1. Estructura de carpetas

```
nestsar/
├── docs/
│   └── ARCHITECTURE.md        # este documento
├── prisma7.config.ts          # configuración de Prisma CLI (apunta a src/prisma)
├── src/
│   ├── main.ts                # arranque de la app, ValidationPipe global
│   ├── app.module.ts          # módulo raíz: importa todos los módulos de dominio
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── common/                # código transversal reutilizable entre módulos
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   └── interfaces/
│   │       └── jwt-payload.interface.ts
│   ├── generated/prisma/      # cliente generado por Prisma. NO editar a mano
│   ├── prisma/                # integración con Prisma
│   │   ├── prisma.module.ts   # módulo @Global que exporta PrismaService
│   │   ├── prisma.service.ts
│   │   ├── schema.prisma      # esquema de datos (fuente de verdad)
│   │   └── migrations/        # migraciones SQL generadas por Prisma
│   └── modules/               # un módulo por dominio de negocio
│       ├── auth/              # login y registro
│       ├── users/             # acceso a datos de usuarios
│       └── roles/             # CRUD de roles (generado con nest g resource)
└── test/                      # pruebas end-to-end
```

## 2. Reglas de organización

### 2.1 Un módulo por dominio

Cada carpeta dentro de `src/modules/` es un dominio de negocio y contiene solo lo suyo:

```
modules/<dominio>/
├── <dominio>.module.ts
├── <dominio>.controller.ts
├── <dominio>.service.ts
├── <dominio>.controller.spec.ts
├── <dominio>.service.spec.ts
├── dto/                 # create-*.dto.ts, update-*.dto.ts, login.dto.ts, ...
└── entities/            # tipos de respuesta o entidades del dominio
```

Para crear un módulo nuevo con su CRUD:

```bash
nest g resource modules/<nombre> --type rest --no-interactive
```

### 2.2 Límites entre módulos

- Un módulo solo expone lo que necesita en `exports`.
- Otro módulo **no** accede directamente a los datos de un dominio ajeno. Debe importar el módulo y usar su servicio (por ejemplo, `auth` usa `UsersService`, no `prisma.user`).
- Si dos módulos dependen mucho entre sí, revisar si la frontera está bien definida.

### 2.3 Código transversal en `common/`

Va en `src/common/` lo que usan varios módulos:

- Guards (`guards/`), por ejemplo `JwtAuthGuard`.
- Interfaces compartidas (`interfaces/`), por ejemplo `JwtPayload`.
- Decoradores, filtros, pipes e interceptores cuando existan.

Regla: si un archivo en `common/` importa algo de un módulo de dominio, probablemente pertenece a ese módulo.

### 2.4 Acceso a datos

- Todo acceso a la base de datos pasa por `PrismaService`, inyectado en el servicio del dominio.
- `PrismaModule` es global: no hace falta importarlo en cada módulo.
- Los tipos de Prisma se importan desde `src/generated/prisma/client`.

### 2.5 Validación

- `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true` (en `main.ts`).
- Los DTOs usan `class-validator`. Los campos no declarados en el DTO se rechazan.

### 2.6 Configuración

- `ConfigModule.forRoot({ isGlobal: true })` en `app.module.ts`.
- Variables de entorno en `.env` (no se versiona). Plantilla en `.env.example`.
- Variables actuales: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (opcional, por defecto `1h`), `PORT` (opcional, por defecto `3000`).

## 3. Modelo de datos

Fuente de verdad: `src/prisma/schema.prisma`. Base de datos: PostgreSQL.

### 3.1 Diagrama de relaciones

```
Role 1 ───── 0..n User
 (roles)        (users)
```

Un usuario puede tener un rol o ninguno (`roleId` es opcional).

### 3.2 Modelo `User` (tabla `users`)

| Campo       | Tipo       | Restricciones                       |
|-------------|------------|-------------------------------------|
| `id`        | Int        | PK, autoincrement                   |
| `email`     | String     | único                               |
| `password`  | String     | hash de bcrypt                      |
| `name`      | String?    | opcional                            |
| `roleId`    | Int?       | FK a `Role.id`, opcional            |
| `createdAt` | DateTime   | por defecto `now()`                 |
| `updatedAt` | DateTime   | se actualiza automáticamente        |

### 3.3 Modelo `Role` (tabla `roles`)

| Campo       | Tipo       | Restricciones                       |
|-------------|------------|-------------------------------------|
| `id`        | Int        | PK, autoincrement                   |
| `name`      | String     | único                               |
| `createdAt` | DateTime   | por defecto `now()`                 |
| `updatedAt` | DateTime   | se actualiza automáticamente        |

### 3.4 Convenciones del esquema

- Modelos en singular y PascalCase (`User`, `Role`). Tablas en plural y minúsculas con `@@map` (`users`, `roles`).
- Todo modelo tiene `id`, `createdAt` y `updatedAt`.
- Las relaciones opcionales usan campos `?`, para no romper datos existentes al migrar.
- Agregar un modelo nuevo: editar `schema.prisma` y ejecutar `npx prisma migrate dev --name <descripcion>`.

## 4. Estado actual y pendientes

- [x] Módulos `auth`, `users`, `roles` creados.
- [x] Modelo `Role` y relación con `User`.
- [x] Guard JWT y tipos compartidos movidos a `common/`.
- [ ] Migración del modelo `Role` aplicada (`npx prisma migrate dev --name add-roles`).
- [ ] Lógica de `RolesService` y `RolesController` (hoy son stubs generados por el CLI).
- [ ] `RolesGuard` y decorador `@Roles()` en `common/` para autorización por rol.
- [ ] Validación del esquema de variables de entorno al arrancar.

## 5. Comandos útiles

```bash
npm run start:dev                        # desarrollo con recarga
npm run build                            # compilar
npm run test                             # pruebas unitarias
npx tsc --noEmit -p tsconfig.json        # verificar tipos sin generar archivos
npx prisma migrate dev --name <nombre>   # crear y aplicar migración
npx prisma generate                      # regenerar el cliente
nest g resource modules/<nombre> --type rest --no-interactive
```
