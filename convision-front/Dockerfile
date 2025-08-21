# Use official Node.js LTS image as base
FROM node:18-bullseye

# Install Bun, git, and useful tools
RUN curl -fsSL https://bun.sh/install | bash \
    && apt-get update \
    && apt-get install -y git vim curl \
    && rm -rf /var/lib/apt/lists/*

# Add bun to PATH
ENV PATH="/root/.bun/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Optionally, install with bun as well (uncomment if you want bun deps)
# COPY bun.lockb ./
# RUN bun install

# Copy the rest of the code
COPY . .

# Create a non-root user for development
RUN useradd -ms /bin/bash devuser
USER devuser

# Expose Vite dev server port
EXPOSE 4300

# Default command: start a shell (for development)
CMD ["tail", "-f", "/dev/null"] 