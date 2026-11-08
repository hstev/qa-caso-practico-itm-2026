# Caso Práctico Final – Aseguramiento de la Calidad (ITM 2026)

Laboratorio de QA **aislado en Docker** sobre **OWASP Juice Shop v20.3.0**: pruebas manuales y automatizadas
(Playwright + TypeScript), rendimiento (k6), SAST (SonarQube) y DAST (OWASP ZAP).

**Informe:** [`docs/Informe-Caso-Practico-QA-ITM-2026.docx`](docs/Informe-Caso-Practico-QA-ITM-2026.docx)
(diseño según el Manual de Imagen ITM 2025).

## Aislamiento

- Todo corre en contenedores del proyecto Compose `qa-itm` con red propia (`qa-itm-net`).
- Puertos publicados solo en `127.0.0.1` (Juice Shop :3000, SonarQube :9000).
- Sin `privileged` ni `network_mode: host`; `no-new-privileges` y `cap_drop: ALL` donde aplica.
- Solo se montan carpetas de este repositorio; imágenes con versión fija.
- `make clean` elimina contenedores, red y volúmenes.

## Uso rápido

```bash
make sut            # clona el código fuente de Juice Shop v20.3.0 (para SonarQube)
make up             # Juice Shop en http://127.0.0.1:3000
make test           # suite Playwright TA-01..TA-15
make evidence       # capturas de los casos manuales CP-01..CP-12
make perf           # k6 (carga 20 VU)
make zap-baseline   # ZAP pasivo
make zap-full       # ZAP activo (Automation Framework)
make sonar-up       # SonarQube; crear token y guardarlo en .env (SONAR_TOKEN=...)
make sonar-scan
make clean
```

Regenerar el informe (en contenedor):

```bash
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -w /work/docs/generator -v "$PWD:/work" \
  node:22.20.0-bookworm sh -c "npm install && npm run build"
```

## Estructura

| Ruta | Contenido |
|---|---|
| `docker-compose.yml`, `Makefile` | Laboratorio aislado |
| `tests/e2e/` | Playwright + TypeScript (UI/API, evidencias) |
| `tests/perf/` | Scripts k6 (carga y estrés) |
| `security/` | Configuración de SonarQube y plan de ZAP |
| `reports/` | Reportes y evidencias exportadas |
| `.github/workflows/qa.yml` | Pipeline CI/CD |
| `.github/ISSUE_TEMPLATE/defecto.yml` | Plantilla de defectos |
| `docs/` | Informe y su generador |

> Juice Shop es una aplicación **intencionalmente vulnerable**. No la exponga fuera de `127.0.0.1`.
