.PHONY: build run clean test deps

# Build the Go server
build:
	@echo "Building Go server..."
	@go build -o bin/server main.go
	@echo "Build complete: bin/server"

# Build with client
build-all:
	@echo "Building client..."
	@cd client && npm run build
	@echo "Building Go server..."
	@go build -o bin/server main.go
	@echo "Build complete"

# Run the server
run:
	@echo "Starting server..."
	@./bin/server

# Run with auto-reload (requires air or similar tool)
dev:
	@go run main.go

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf bin/
	@echo "Clean complete"

# Install Go dependencies
deps:
	@echo "Installing Go dependencies..."
	@go mod download
	@echo "Dependencies installed"

# Run tests
test:
	@echo "Running tests..."
	@go test ./... -v

# Format code
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Run linter
lint:
	@echo "Running linter..."
	@golangci-lint run || echo "golangci-lint not installed"

# Build for production
build-prod:
	@echo "Building for production..."
	@cd client && npm run build
	@CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/server main.go
	@echo "Production build complete"

help:
	@echo "Available targets:"
	@echo "  build      - Build the Go server"
	@echo "  build-all  - Build both client and server"
	@echo "  run        - Run the server"
	@echo "  dev        - Run in development mode"
	@echo "  clean      - Remove build artifacts"
	@echo "  deps       - Install dependencies"
	@echo "  test       - Run tests"
	@echo "  fmt        - Format code"
	@echo "  lint       - Run linter"
	@echo "  build-prod - Build for production"
