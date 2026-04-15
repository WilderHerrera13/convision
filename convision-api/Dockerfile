# Use PHP 8.0 CLI for development
FROM php:8.0-cli

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (using a more compatible method)
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip

# Install Xdebug for development
RUN pecl install xdebug \
    && docker-php-ext-enable xdebug

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy PHP configuration
COPY docker/app/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY docker/app/xdebug.ini /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini

# Create a non-root user for development
RUN useradd -ms /bin/bash devuser

# Change ownership
RUN chown -R devuser:devuser /app

# Switch to devuser user
USER devuser

# Expose port 8000
EXPOSE 8000

# Keep container running for development
CMD ["tail", "-f", "/dev/null"] 