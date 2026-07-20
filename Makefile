.PHONY: dev stop logs format check

# Prettier (80 colonnes) sur web + server
format:
	cd web && bun run format
	cd server && bun run format

# astro check (web) + tsc (server)
check:
	cd web && bun run check
	cd server && bun run check

# Lance site + API + Pocketbase en local (aucun redémarrage auto)
dev:
	docker compose -f docker-compose.dev.yml up -d --build
	@echo "site:       http://localhost:3000"
	@echo "pocketbase: http://localhost:8090/_/"

stop:
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose -f docker-compose.dev.yml logs -f
