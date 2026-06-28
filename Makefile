IMAGE_NAME ?= roomloop
CONTAINER_NAME ?= roomloop-dev
PORT ?= 3001

.PHONY: help docker-build docker-run docker-dev docker-stop test

help:
	@echo "Targets:"
	@echo "  make docker-build   Build the production Docker image"
	@echo "  make docker-run     Run the production Docker image"
	@echo "  make docker-dev     Build and run the Docker dev image with watch mode"
	@echo "  make docker-stop    Stop the dev container if it is running"
	@echo "  make test           Run the Node test suite"

docker-build:
	docker build -t $(IMAGE_NAME):latest .

docker-run:
	docker run --rm -p $(PORT):3001 --env-file .env $(IMAGE_NAME):latest

docker-dev:
	docker build --target dev -t $(IMAGE_NAME):dev .
	docker run --rm -it --name $(CONTAINER_NAME) -p $(PORT):3001 --env-file .env -v "$(CURDIR):/app" -v $(IMAGE_NAME)-node_modules:/app/node_modules $(IMAGE_NAME):dev

docker-stop:
	docker stop $(CONTAINER_NAME)

test:
	npm test
