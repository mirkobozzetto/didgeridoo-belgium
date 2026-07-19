.PHONY: dev stop logs

# Lance site + API + Pocketbase en local (aucun redémarrage auto)
dev:
	docker compose -f docker-compose.dev.yml up -d --build
	@echo "site:       http://localhost:3000"
	@echo "pocketbase: http://localhost:8090/_/"

stop:
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose -f docker-compose.dev.yml logs -f
