# Documentación de la API con Swagger

Este documento explica cómo se documenta la API de SAR con Swagger (OpenAPI), cómo consultarla y cómo mantenerla al agregar endpoints nuevos.

## 1. Acceso

| Recurso             | URL local                              |
|---------------------|----------------------------------------|
| Interfaz Swagger UI | http://localhost:3000/api/docs         |
| Especificación JSON | http://localhost:3000/api/docs-json    |

El puerto sale de la variable `PORT` (por defecto `3000`).

## 2. Configuración

Está en `src/main.ts`:

```ts
const swaggerConfig = new DocumentBuilder()
  .setTitle('SAR API')
  .setDescription('Documentación de la API de SAR')
  .setVersion('0.0.1')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api/docs', app, document);
```

- `addBearerAuth()` agrega el esquema de autenticación Bearer. Así, en Swagger UI aparece el botón **Authorize** para pegar el token JWT.
- `setup('api/docs', ...)` define la ruta de la interfaz. Si la cambias, actualiza también este documento y el front.

## 3. Plugin del CLI

En `nest-cli.json` está activado el plugin de Swagger:

```json
"compilerOptions": {
  "plugins": ["@nestjs/swagger"]
}
```

Con el plugin, Swagger lee automáticamente los tipos de los DTOs y sus validaciones de `class-validator`. Por eso **no hace falta** decorar cada propiedad con `@ApiProperty()`.

Requisito: el plugin solo actúa durante la compilación. Si cambias `nest-cli.json`, reinicia `npm run start:dev`.

## 4. Convenciones por módulo

### 4.1 Etiquetas (`@ApiTags`)

Cada controlador lleva una etiqueta, que agrupa sus endpoints en Swagger UI:

```ts
@ApiTags('roles')
@Controller('roles')
export class RolesController { ... }
```

Usa el nombre del dominio en minúsculas, igual que la carpeta en `src/modules/`.

### 4.2 Autenticación (`@ApiBearerAuth`)

Todo endpoint protegido con `JwtAuthGuard` lleva `@ApiBearerAuth()`:

```ts
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(...) { ... }
```

Sin este decorador, Swagger mostraría el endpoint como público aunque exija token.

### 4.3 Descripciones y respuestas (recomendado)

Para endpoints importantes, agrega descripción y códigos de respuesta:

```ts
@ApiOperation({ summary: 'Crear un rol' })
@ApiResponse({ status: 201, description: 'Rol creado' })
@ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre' })
@Post()
create(...) { ... }
```

- `@ApiOperation` sirve para el resumen corto de cada endpoint.
- `@ApiResponse` documenta los códigos posibles. Incluye también los errores, no solo el éxito.

### 4.4 Parámetros

Los parámetros de ruta y query se documentan con `@ApiParam` y `@ApiQuery` cuando su significado no es obvio. El plugin ya infiere sus tipos.

## 5. Estado actual

| Módulo  | Etiqueta | Endpoints protegidos con Bearer | Descripciones y respuestas |
|---------|----------|---------------------------------|----------------------------|
| auth    | `auth`   | `GET /auth/profile`             | pendiente                  |
| roles   | `roles`  | ninguno                         | pendiente (stubs)          |
| users   | —        | sin controlador HTTP            | no aplica                  |

## 6. Checklist para un endpoint nuevo

- [ ] El controlador tiene `@ApiTags`.
- [ ] Si usa `JwtAuthGuard`, tiene `@ApiBearerAuth()`.
- [ ] Los DTOs tienen validaciones de `class-validator` (el plugin las documenta).
- [ ] Los endpoints importantes tienen `@ApiOperation` y `@ApiResponse`.
- [ ] Se verificó en http://localhost:3000/api/docs.

## 7. Producción

Swagger expone la estructura completa de la API. Antes de desplegar, decide si debe estar disponible públicamente. Una opción es activarlo solo con una variable de entorno:

```ts
if (process.env.SWAGGER_ENABLED === 'true') {
  // configuración de Swagger
}
```

Si lo activas, agrega `SWAGGER_ENABLED` a `.env.example` y a las variables de Render.
