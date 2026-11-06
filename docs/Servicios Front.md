# Servicios para el Front

Este documento lista las rutas de la API que el front debe consumir para el login, el registro y el CRUD de usuarios, con ejemplos de la petición que debe enviar.

Para ver y probar todo en vivo: `http://localhost:3000/api/docs` (Swagger).

## 1. Datos generales

| Concepto            | Valor                                                    |
|---------------------|----------------------------------------------------------|
| URL base (local)    | `http://localhost:3000`                                  |
| Formato             | JSON                                                     |
| Cabecera obligatoria| `Content-Type: application/json` (en peticiones con cuerpo) |
| Autenticación       | `Authorization: Bearer <accessToken>` (rutas protegidas) |
| CORS                | Solo acepta el origen definido en `FRONT_URL` del `.env` |

### Validaciones que aplica el backend

- Los campos que no estén en el DTO **se rechazan con `400`** (no envíes campos extra).
- Un `email` debe tener formato válido.
- Una `password` debe tener **al menos 8 caracteres**.
- Los `id` de la URL deben ser números enteros (`/users/5`).

### Formato de error

Todos los errores llegan con esta forma:

```json
{
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "statusCode": 401
}
```

| Código | Cuándo ocurre                                                   |
|--------|-----------------------------------------------------------------|
| 400    | Datos inválidos (email mal formado, password corta, campo extra) |
| 401    | Credenciales incorrectas o token ausente / inválido / vencido   |
| 404    | El usuario con ese `id` no existe                               |
| 409    | El email ya está registrado                                     |

## 2. Resumen de rutas

| Método | Ruta              | Protegida | Uso                              |
|--------|-------------------|-----------|----------------------------------|
| POST   | `/auth/register`  | No        | Registrar una cuenta nueva       |
| POST   | `/auth/login`     | No        | Iniciar sesión y obtener el token|
| GET    | `/auth/profile`   | Sí        | Datos del usuario logueado       |
| POST   | `/users`          | Sí        | Crear un usuario                 |
| GET    | `/users`          | Sí        | Listar usuarios                  |
| GET    | `/users/:id`      | Sí        | Obtener un usuario               |
| PATCH  | `/users/:id`      | Sí        | Actualizar un usuario (parcial)  |
| DELETE | `/users/:id`      | Sí        | Eliminar un usuario              |

## 3. Login y registro

### 3.1 Registrar (`POST /auth/register`)

Cuerpo:

| Campo      | Tipo   | Obligatorio | Regla                        |
|------------|--------|-------------|------------------------------|
| `email`    | string | Sí          | Formato de email             |
| `password` | string | Sí          | Mínimo 8 caracteres          |
| `name`     | string | No          | Texto                        |

Ejemplo con `fetch`:

```js
const res = await fetch('http://localhost:3000/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'ana@example.com',
    password: 'password123',
    name: 'Ana',
  }),
});
const user = await res.json();
```

Respuesta `201` (la contraseña nunca se devuelve):

```json
{
  "id": 1,
  "email": "ana@example.com",
  "name": "Ana",
  "createdAt": "2026-11-05T10:00:00.000Z"
}
```

Error `409` si el email ya existe: `"Email already registered"`.

### 3.2 Login (`POST /auth/login`)

Cuerpo:

| Campo      | Tipo   | Obligatorio | Regla               |
|------------|--------|-------------|---------------------|
| `email`    | string | Sí          | Formato de email    |
| `password` | string | Sí          | Texto               |

Ejemplo con `fetch`:

```js
const res = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'ana@example.com',
    password: 'password123',
  }),
});

if (!res.ok) {
  // 401 -> "Invalid credentials"
  throw new Error('Credenciales incorrectas');
}

const { accessToken } = await res.json();
localStorage.setItem('token', accessToken); // o donde guardes la sesión
```

Respuesta `200`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
}
```

El token expira según `JWT_EXPIRES_IN` (por defecto `1h`). Cuando expire, la API responde `401` y el front debe volver a pedir login.

### 3.3 Perfil del usuario logueado (`GET /auth/profile`)

Requiere la cabecera `Authorization`:

```js
const res = await fetch('http://localhost:3000/auth/profile', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});
const me = await res.json();
```

Respuesta `200`: `{ "id": 1, "email": "ana@example.com", "name": "Ana", "createdAt": "..." }`

## 4. CRUD de usuarios

Todas estas rutas requieren el token:

```
Authorization: Bearer <accessToken>
```

### 4.1 Crear usuario (`POST /users`)

Cuerpo:

| Campo      | Tipo    | Obligatorio | Regla                                   |
|------------|---------|-------------|-----------------------------------------|
| `email`    | string  | Sí          | Formato de email, único                 |
| `password` | string  | Sí          | Mínimo 8 caracteres                     |
| `name`     | string  | No          | Texto                                   |
| `roleId`   | number  | No          | Entero, id de un rol existente          |

Ejemplo:

```js
const res = await fetch('http://localhost:3000/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    email: 'luis@example.com',
    password: 'password456',
    name: 'Luis',
    roleId: 1,
  }),
});
```

Respuesta `201`:

```json
{
  "id": 2,
  "email": "luis@example.com",
  "name": "Luis",
  "roleId": 1,
  "createdAt": "2026-11-05T10:05:00.000Z",
  "updatedAt": "2026-11-05T10:05:00.000Z"
}
```

### 4.2 Listar usuarios (`GET /users`)

```js
const res = await fetch('http://localhost:3000/users', {
  headers: { Authorization: `Bearer ${token}` },
});
const users = await res.json(); // arreglo ordenado por id
```

### 4.3 Obtener un usuario (`GET /users/:id`)

```js
const res = await fetch(`http://localhost:3000/users/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

Error `404` si no existe: `"User #<id> not found"`.

### 4.4 Actualizar usuario (`PATCH /users/:id`)

Envía solo los campos que cambian. Todos los campos del cuerpo son opcionales (los mismos de la creación). Si envías `password`, el backend la hashea.

```js
const res = await fetch(`http://localhost:3000/users/${id}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ name: 'Luis Pérez' }),
});
```

Errores: `404` si el usuario no existe, `409` si el nuevo email ya lo usa otro usuario.

### 4.5 Eliminar usuario (`DELETE /users/:id`)

```js
const res = await fetch(`http://localhost:3000/users/${id}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
const deleted = await res.json(); // datos del usuario eliminado
```

Errores: `404` si el usuario no existe.

## 5. Notas para el front

- **Nunca** recibirás ni debes enviar `password` en las respuestas: las respuestas de usuario no la incluyen.
- Si una petición protegida responde `401`, borra el token guardado y redirige al login.
- Los `400` traen el motivo en `message`, que puede ser un arreglo con varios mensajes de validación. Muéstralos al usuario.
- Antes de probar login o usuarios, el backend debe tener aplicada la migración del esquema (`npx prisma migrate deploy`). Sin ella, `login` y las rutas de usuarios responden `500`.
