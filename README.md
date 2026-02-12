# stackAudit 🕵️‍♂️

> **Elimina el "funciona en mi máquina" para siempre.**
> Una CLI Open Source para validar tu entorno de desarrollo en segundos.

`stackAudit` es una herramienta de línea de comandos diseñada para auditar el entorno local de un desarrollador frente a un archivo de configuración declarativo (`stackAudit.config.json`). Asegura que todas las dependencias, puertos, versiones y variables de entorno estén listas **antes** de que intentes iniciar tu aplicación.

---

## 🚀 Filosofía

*   **Fail Efficiently:** No más "Whack-a-Mole" de errores. `stackAudit` ejecuta verificaciones en paralelo y te reporta *todos* los problemas de golpe.
*   **Cero Configuración Oculta:** Si tu proyecto lo necesita, debe estar en `stackAudit.config.json`.
*   **Local-First:** Todo ocurre en tu máquina. Tus secretos (`.env`) nunca salen de tu ordenador.
*   **CI/CD Ready:** Diseñado para funcionar igual en tu laptop y en tus pipelines de GitHub Actions.

## 📦 Instalación

### Vía NPM (Recomendado para Node.js)

```bash
npm install -g stackaudit
# O ejecútalo directamente con npx
npx stackaudit check
```

### Binarios Standalone (Próximamente)

Para desarrolladores de Go, Python, PHP, etc., ofreceremos binarios compilados (Single Executable Applications) que no requieren instalar Node.js globalmente.

---

## 🛠 Guía de Uso

### 1. Inicializar

Genera un archivo de configuración base en tu proyecto:

```bash
stackaudit init
```

Esto creará un archivo `stackAudit.config.json` en la raíz de tu proyecto.

### 2. Configurar

Edita `stackAudit.config.json` para definir los requisitos de tu proyecto. Ejemplo:

```json
{
  "projectName": "Mi Super SaaS",
  "version": "1.0.0",
  "checks": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0",
    "env": {
      "required": ["DATABASE_URL", "STRIPE_SECRET_KEY"]
    },
    "ports": [
      { "port": 5432, "name": "PostgreSQL", "type": "tcp" },
      { "port": 6379, "name": "Redis" }
    ],
    "commands": [
      { 
        "cmd": "docker info", 
        "match": "Server Version", 
        "errorMsg": "Docker Daemon no está corriendo." 
      }
    ]
  }
}
```

### 3. Auditar

Ejecuta el comando check antes de trabajar:

```bash
stackaudit check
```

✅ Si todo está bien, verás un mensaje de éxito.
❌ Si algo falla, recibirás un reporte detallado de qué falta (ej: puerto 5432 ocupado, falta variable STRIPE_KEY, versión de Node incorrecta).

---

## 🏗 Arquitectura y Tecnología

`stackAudit` está construido con tecnologías modernas y pensado para ser robusto:

*   **Core:** Node.js (>=18) + TypeScript 5.x (ESModules).
*   **Ejecución:** Paralela (`Promise.allSettled`) para máxima velocidad.
*   **Validación:** Zod para esquemas estrictos.
*   **UX:** `commander`, `chalk`, `ora` para una experiencia de terminal premium.
*   **Checks Inteligentes:**
    *   **Puertos:** Estrategia "Wait-for" con backoff exponencial (evita falsos negativos si la DB está arrancando).
    *   **Env:** Valida contra `process.env` (compatible con Docker/K8s/CI), no solo archivos de texto.

## 🗺 Roadmap

- [ ] **Fase 1 (MVP):** Validación de Node, Archivos y CLI básica.
- [ ] **Fase 2 (Robustez):** Checks de Puertos (Wait-for), Variables de Entorno, Comandos custom.
- [ ] **Fase 3 (DevEx):** Comando `init`, UI mejorada, Distribución de binarios nativos (SEA).

## 🤝 Contribuyendo

¡Las contribuciones son bienvenidas!

1.  Haz un Fork del repositorio.
2.  Crea tu rama de feature (`git checkout -b feature/AmazingFeature`).
3.  Haz Commit de tus cambios (`git commit -m 'Add some AmazingFeature'`).
4.  Push a la rama (`git push origin feature/AmazingFeature`).
5.  Abre un Pull Request.

## 📄 Licencia

Distribuido bajo la licencia MIT. Ver `LICENSE` para más información.
