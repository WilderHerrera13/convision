BINARY   := convision-api
BUILD_DIR := bin
CMD       := ./cmd/api

.PHONY: all build run dev test lint clean migrate tidy

## all: build the binary
all: build

## build: compile the server binary
build:
	@mkdir -p $(BUILD_DIR)
	go build -o $(BUILD_DIR)/$(BINARY) $(CMD)

## run: build and run the server
run: build
	./$(BUILD_DIR)/$(BINARY)

## dev: run with live-reload using air (go install github.com/cosmtrek/air@latest)
dev:
	air -c .air.toml

## test: run all tests with coverage
test:
	go test ./... -coverprofile=coverage.out
	go tool cover -func=coverage.out

## lint: run golangci-lint (go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
lint:
	golangci-lint run ./...

## tidy: clean up module dependencies
tidy:
	go mod tidy

## clean: remove build artifacts
clean:
	rm -rf $(BUILD_DIR) coverage.out

## docker-up: start the full Docker stack
docker-up:
	docker compose -f docker/docker-compose.yml up -d

## docker-down: stop the Docker stack
docker-down:
	docker compose -f docker/docker-compose.yml down

## migrate: run pending migrations on platform schema
migrate:
	go run ./cmd/migrate

## migrate-tenant: migrate a single tenant  (usage: make migrate-tenant TENANT=clinica-vision)
migrate-tenant:
	go run ./cmd/migrate -tenant $(TENANT)

## migrate-all: migrate platform + all active tenants
migrate-all:
	go run ./cmd/migrate -all

## migrate-down: rollback last migration on platform (usage: make migrate-down TENANT=clinica-vision)
migrate-down:
	go run ./cmd/migrate -down $(if $(TENANT),-tenant $(TENANT)) -steps 1

## migrate-list: list migration status (usage: make migrate-list [TENANT=clinica-vision])
migrate-list:
	go run ./cmd/migrate -list $(if $(TENANT),-tenant $(TENANT))

## migration: create a new empty migration pair  (usage: make migration NAME=add_phone_to_patients [SCOPE=platform])
migration:
	go run ./cmd/migrate -new $(NAME) $(if $(filter platform,$(SCOPE)),,)