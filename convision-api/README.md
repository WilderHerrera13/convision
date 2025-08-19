# Convision API

A RESTful API for the Convision optical store application, built with Laravel 10.

## Requirements

-   PHP >= 8.1
-   MySQL >= 8.0
-   Composer
-   Node.js & NPM (for frontend)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd convision-api
```

2. Install PHP dependencies:

```bash
composer install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Generate application key:

```bash
php artisan key:generate
```

5. Generate JWT secret:

```bash
php artisan jwt:secret
```

6. Configure your database in `.env`:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=convision
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

7. Run migrations and seeders:

```bash
php artisan migrate --seed
```

8. Start the development server:

```bash
php artisan serve
```

The API will be available at `http://localhost:8000`.

## API Documentation

The API documentation is available at `/api/documentation` after running the server.

### Authentication

All API endpoints (except login) require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

### Default Users

The seeder creates three default users:

1. Admin:

    - Email: admin@convision.com
    - Password: password

2. Specialist:

    - Email: specialist@convision.com
    - Password: password

3. Receptionist:
    - Email: receptionist@convision.com
    - Password: password

### API Endpoints

#### Authentication

-   `POST /api/v1/auth/login` - Login and get JWT token
-   `POST /api/v1/auth/logout` - Logout (invalidate token)
-   `GET /api/v1/auth/me` - Get authenticated user details

#### Users

-   `GET /api/v1/users` - List all users (admin only)
-   `POST /api/v1/users` - Create a new user (admin only)
-   `GET /api/v1/users/{id}` - Get user details
-   `PUT /api/v1/users/{id}` - Update user (admin only)
-   `DELETE /api/v1/users/{id}` - Delete user (admin only)

#### Lenses

-   `GET /api/v1/lenses` - List all lenses
-   `POST /api/v1/lenses` - Create a new lens (admin/specialist)
-   `GET /api/v1/lenses/{id}` - Get lens details
-   `PUT /api/v1/lenses/{id}` - Update lens (admin/specialist)
-   `DELETE /api/v1/lenses/{id}` - Delete lens (admin only)

## Testing

Run the test suite:

```bash
php artisan test
```

## License

This project is licensed under the MIT License.
