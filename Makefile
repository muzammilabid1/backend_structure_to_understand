# This rule intentionally declared first.
# Invoking `make` with no arguments will run the first rule it finds,
# so we set an explicit default before anything else, preferably something benign.
.PHONY: default
default: init # TODO(cj): change to 'usage' once proven safe

.PHONY: usage
usage:
	@echo 'usage: make [command]'
	@echo 'commands:'
	@echo '  init - initialise dev environment'
	@echo '  dev  - start local development stack'
	@echo '  up   - start docker compose services'
	@echo '  down - stop docker compose services'

apps_container=apps
apps_user=node
postgres_container=postgres_db

.PHONY: init
init: copy-env dc-stop-rm dc-up-d install references-build db-reset ## Initialize projects

.PHONY: dev
dev: up all-dev-start

.PHONY: up
up: dc-up-d

.PHONY: down
down: dc-stop

.PHONY: copy-env
copy-env: ## Copy .env files to .env.local
	cp --no-clobber .env.sample .env
	cp --no-clobber graphql-provider/.env.sample graphql-provider/.env

.PHONY: dc-build
dc-build: ## Build containers
	docker compose build

.PHONY: dc-up
dc-up: ## Start containers (with logs)
	docker compose up

.PHONY: dc-up-d
dc-up-d: ## Start containers
	docker compose up -d

.PHONY: dc-stop
dc-stop: ## Stop containers
	docker compose stop

.PHONY: dc-stop-rm
dc-stop-rm: ## Stop and delete containers / Clean volumes
	docker compose down --rmi all --remove-orphans
	docker compose rm --volumes --force
	docker compose build

.PHONY: bash
bash: ## Connect to the development container (app)
	docker compose exec --user=${apps_user} ${apps_container} /bin/bash

.PHONY: install
install: ## Install projects dependencies
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'yarn install'
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd e2e-tests && yarn install'

.PHONY: db-reset
db-reset: ## Reset the DB (with fake data)
	docker compose stop ${postgres_container}
	docker compose rm --force ${postgres_container}
	docker compose up -d ${postgres_container}
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd graphql-provider && yarn run typeorm migration:run -c "Superuser"'
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd graphql-provider && psql "postgresql://$$PGSUPERUSER:$$PGSUPERPASSWORD@$$PGHOST:$$PGPORT/$$PGDATABASE" < ../e2e-tests/setup.sql'

.PHONY: references-build
references-build: ## Start graphql app
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd graphql-provider && yarn references:build'
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd frontend && yarn references:build'

.PHONY: all-dev-start
all-dev-start: graphql-dev-start frontend-dev-start ## Start graphql/frontend apps

.PHONY: graphql-dev-start
graphql-dev-start: ## Start graphql app
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd graphql-provider && pm2 start "yarn dev" --name graphql-dev'

.PHONY: frontend-dev-start
frontend-dev-start: ## Start frontend app
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd frontend && pm2 start "yarn dev" --name frontend-dev'

.PHONY: all-dev-restart
all-dev-restart: graphql-dev-restart frontend-dev-restart ## Start graphql/frontend apps

.PHONY: graphql-dev-restart
graphql-dev-restart: ## Restart graphql app
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd graphql-provider && pm2 restart graphql-dev'

.PHONY: frontend-dev-restart
frontend-dev-restart: ## Restart frontend app
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd frontend && pm2 restart frontend-dev'

.PHONY: logs
logs: ## Show frontend app logs
	docker compose exec --user=${apps_user} ${apps_container} sh -lc 'cd frontend && pm2 logs'

.PHONY: playwright
playwright: ## Execute Playwright tests without UI
	cd ./e2e-tests && yarn playwright test

.PHONY: playwright-ui
playwright-ui: ## Open Playwright UI
	cd ./e2e-tests && yarn playwright test --ui
