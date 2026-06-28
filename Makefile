IMAGE_NAME ?= roomloop
DEV_CONTAINER_NAME ?= roomloop-dev
PROD_CONTAINER_NAME ?= roomloop-prod
HOST_PORT ?= 3001
HOST_PORT_DEV ?= 3002
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
	docker run --rm --name $(PROD_CONTAINER_NAME) -p $(HOST_PORT):3001 --env-file .env -e PORT=3001 $(IMAGE_NAME):latest

docker-dev:
	docker build --target dev -t $(IMAGE_NAME):dev .
	docker run --rm -it --name $(DEV_CONTAINER_NAME) -p $(HOST_PORT_DEV):3001 --env-file .env -e PORT=3001 -v "$(CURDIR):/app" -v $(IMAGE_NAME)-node_modules:/app/node_modules $(IMAGE_NAME):dev

docker-stop:
	-docker stop $(DEV_CONTAINER_NAME)
	-docker stop $(PROD_CONTAINER_NAME)

test:
	npm test
