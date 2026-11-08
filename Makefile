# Laboratorio QA aislado - todo se ejecuta en contenedores (proyecto docker compose "qa-itm")
SHELL := /bin/bash
export UID := $(shell id -u)
export GID := $(shell id -g)
DC := docker compose
JS_VERSION := v20.3.0

.PHONY: help sut up sonar-up test evidence perf zap-baseline zap-full sonar-scan down clean

help:            ## Lista de comandos
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-14s %s\n", $$1, $$2}'

sut:             ## Clona el código fuente de Juice Shop (para SonarQube)
	@test -d sut/juice-shop || git clone --depth 1 --branch $(JS_VERSION) https://github.com/juice-shop/juice-shop.git sut/juice-shop

up:              ## Levanta Juice Shop en http://127.0.0.1:3000
	$(DC) up -d juice-shop

sonar-up:        ## Levanta SonarQube en http://127.0.0.1:9000
	$(DC) --profile sonar up -d sonarqube

test: up         ## Ejecuta la suite automatizada Playwright (TA-01..TA-15)
	$(DC) --profile tools run --rm playwright sh -c "npm install --no-audit --no-fund --ignore-scripts && npx playwright test"

evidence: up     ## Captura evidencias de los casos manuales (CP-01..CP-12)
	$(DC) --profile tools run --rm -v "$(PWD)/reports/evidence:/reports" playwright npx playwright test -c playwright.evidence.config.ts

perf: up         ## Prueba de carga k6 (20 VU)
	$(DC) --profile tools run --rm k6 run --summary-export=/reports/k6-summary.json /scripts/carga-basica.js

zap-baseline: up ## Escaneo pasivo OWASP ZAP
	$(DC) --profile tools run --rm zap zap-baseline.py -t http://juice-shop:3000 -m 2 -I -r zap-baseline.html -J zap-baseline.json -w zap-baseline.md

zap-full: up     ## Escaneo activo OWASP ZAP (Automation Framework)
	$(DC) --profile tools run --rm zap zap.sh -cmd -autorun /zap/config/plan-full.yaml

sonar-scan:      ## Análisis estático (requiere SONAR_TOKEN en .env)
	set -a; . ./.env; set +a; $(DC) --profile tools run --rm sonar-scanner

down:            ## Detiene los contenedores (conserva datos de SonarQube)
	$(DC) --profile sonar --profile tools down

clean:           ## Elimina contenedores, red y volúmenes del laboratorio
	$(DC) --profile sonar --profile tools down -v --remove-orphans
