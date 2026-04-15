#!/bin/bash
set -e

echo "========================================="
echo "  Convision API — inicializando..."
echo "========================================="

cd /var/www/html

echo "[1/5] Instalando dependencias PHP..."
composer install --no-interaction --prefer-dist --optimize-autoloader

echo "[2/5] Generando APP_KEY si falta..."
php artisan key:generate --no-interaction --force

echo "[3/5] Generando JWT secret si falta..."
php artisan jwt:secret --no-interaction --force 2>/dev/null || true

echo "[4/5] Aplicando migraciones..."
php artisan migrate --no-interaction --force

echo "[5/5] Verificando seeds (solo si la BD está vacía)..."
USER_COUNT=$(php artisan tinker --no-interaction --execute="echo \App\Models\User::count();" 2>/dev/null | tail -1 | tr -d '[:space:]')

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "  → BD vacía, ejecutando seeders..."
    php artisan db:seed --no-interaction --force
else
    echo "  → BD ya tiene $USER_COUNT usuarios, omitiendo seeds."
fi

echo ""
echo "========================================="
echo "  API lista en http://0.0.0.0:8000"
echo "========================================="

exec php artisan serve --host=0.0.0.0 --port=8000
