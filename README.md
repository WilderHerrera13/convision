# Convision - Optical Management System

A comprehensive optical management system built with Laravel (API) and React (Frontend).

## 🏗️ Architecture

- **Backend**: Laravel 8+ API (PHP 8.0)
- **Frontend**: React with Vite
- **Database**: MySQL 8.0
- **Development**: Docker containers

## 📋 Prerequisites

- Docker and Docker Compose
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd convision
```

### 2. Environment Setup

Create environment files:

```bash
# Backend environment
cp convision-api/.env.example convision-api/.env

# Frontend environment (if needed)
cp convision-front/.env.example convision-front/.env
```

### 3. Start Docker Containers

```bash
# Build and start all containers
docker compose up -d --build

# Check container status
docker compose ps
```

## 🔧 Post-Installation Setup

After containers are running, you need to set up both frontend and backend.

### Frontend Setup

Open a new terminal and run:

```bash
# Install Node.js dependencies
docker compose exec frontend npm install

# Start development server
docker compose exec frontend npm run dev
```

### Backend Setup

Open another terminal and run:

```bash
# Enter the backend container
docker compose exec app bash

# Inside the container, run these commands:
composer install
php artisan key:generate
php artisan jwt:secret
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

## 🌐 Access Points

After setup, your application will be available at:

- **Frontend**: http://localhost:4300
- **Backend API**: http://localhost:8000
- **phpMyAdmin**: http://localhost:8080
- **MySQL**: localhost:3306

## 🐳 Docker Services

The docker-compose.yml defines these services:

### `app` (Backend)
- **Image**: PHP 8.0 CLI with Laravel
- **Port**: 8000
- **Volume**: `./convision-api:/app`

### `frontend`
- **Image**: Node.js 18 with React/Vite
- **Port**: 4300
- **Volume**: `./convision-front:/app`

### `mysql`
- **Image**: MySQL 8.0
- **Port**: 3306
- **Volume**: Persistent data storage

### `phpmyadmin`
- **Image**: phpMyAdmin
- **Port**: 8080
- **Purpose**: Database management interface

### Stopping Services

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (clean reset)
docker compose down -v
```

## 🗄️ Database Management

### Reset Database

```bash
docker compose exec app php artisan migrate:fresh --seed
```

### Access Database

- **phpMyAdmin**: http://localhost:8080
- **Direct MySQL**: 
  ```bash
  docker compose exec mysql mysql -u root -p
  ```

## 🛠️ Common Commands

### Backend Commands

```bash
# Enter backend container
docker compose exec app bash

# Run migrations
docker compose exec app php artisan migrate

# Run seeders
docker compose exec app php artisan db:seed

# Run tests
docker compose exec app php artisan test

# Clear cache
docker compose exec app php artisan cache:clear
```

### Frontend Commands

```bash
# Install packages
docker compose exec frontend npm install

# Run development server
docker compose exec frontend npm run dev

# Build for production
docker compose exec frontend npm run build

# Run tests
docker compose exec frontend npm test
```


## 📁 Project Structure

```
convision/
├── docker-compose.yml          # Docker services configuration
├── README.md                   # This file
├── convision-api/             # Laravel backend
│   ├── Dockerfile
│   ├── app/                   # Laravel application
│   ├── database/              # Migrations, seeders
│   ├── routes/                # API routes
│   └── .env                   # Backend environment
├── convision-front/           # React frontend
│   ├── Dockerfile
│   ├── src/                   # React components
│   ├── vite.config.ts         # Vite configuration
│   └── .env                   # Frontend environment
```