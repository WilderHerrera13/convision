#!/bin/bash
set -e

echo "========================================="
echo "  Convision API — inicializando..."
echo "========================================="

cd /var/www/html

if [ -f ".env.docker" ]; then
    echo "[0/5] Usando .env.docker como configuración activa..."
    cp .env.docker .env
fi

echo "[1/5] Instalando dependencias PHP..."
composer install --no-interaction --prefer-dist --optimize-autoloader

echo "[2/5] Generando APP_KEY si falta..."
php artisan key:generate --no-interaction --force

echo "[3/5] Generando JWT secret si falta..."
php artisan jwt:secret --no-interaction --force 2>/dev/null || true

echo "[4/5] Aplicando migraciones..."
php artisan migrate --no-interaction --force 2>&1 || {
    echo "  → Primer intento falló, intentando migrar cada archivo individualmente..."
    for migration_file in database/migrations/*.php; do
        migration_name=$(basename "$migration_file" .php)
        php artisan migrate --no-interaction --force --path="database/migrations/${migration_name}.php" 2>/dev/null || true
    done
    echo "  → Migraciones aplicadas (ignorando duplicados)."
}

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
