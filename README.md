# 🛡️ DevSecOps Lab: Secure SDLC Pipeline (NIST SP 800-218 Alignment)

<!-- Dynamic Status Badges -->
![NIST SSDF Compliance](https://img.shields.io/badge/NIST%20SP%20800--218-SSDF%20Aligned-0052CC?style=for-the-badge&logo=nist)
![Security Pipeline](https://img.shields.io/github/actions/workflow/status/lightbringer-07/secure-sdlc-nist-framework/ssdlc-pipeline.yml?branch=main&label=SSDLC%20Pipeline&style=for-the-badge&logo=githubactions)
![Trivy SCA](https://img.shields.io/badge/SCA%20%26%20SBOM-Trivy%20%7C%20CycloneDX-1904DA?style=for-the-badge&logo=aquasecurity)
![Secret Scanning](https://img.shields.io/badge/Secret%20Scanning-Gitleaks-E53935?style=for-the-badge&logo=git)

Este repositorio constituye una implementación práctica de un ciclo de vida de desarrollo de software seguro (**Secure SDLC**) automatizado mediante **GitHub Actions**. Utiliza una API en Node.js/Express (`src/app.js`) con escenarios controlados de riesgo para validar la eficacia, telemetría y bloqueo preventivo de un pipeline de ciberseguridad empresarial.

El objetivo principal es reducir la superficie de ataque desde etapas tempranas (*Shift-Left*) y garantizar la integridad de la cadena de suministro de software antes de cualquier despliegue a producción, alineándose con estándares corporativos de cumplimiento.

---
## 📂 Estructura del Repositorio

```text
secure-sdlc-nist-framework/
├── .github/
│   └── workflows/
│       └── ssdlc-pipeline.yml   # Pipeline CI/CD (SAST CodeQL, SCA/SBOM Trivy, Secretos Gitleaks)
├── src/
│   └── app.js                   # API Node.js/Express evaluada por análisis estático y secretos
├── package.json                 # Manifiesto de dependencias auditado en SCA y base del SBOM
└── README.md                    # Documentación técnica y matriz de cumplimiento NIST SP 800-218
```

## 🎯 Arquitectura de Seguridad (Defense in Depth)

Para mitigar riesgos de forma integral, el flujo de integración continua (`.github/workflows/ssdlc-pipeline.yml`) consolida tres capas automatizadas de control, centralizando todos los hallazgos en formato estándar **SARIF** dentro de la pestaña **Security** y generando resúmenes ejecutivos en `$GITHUB_STEP_SUMMARY`:

### 1. Static Application Security Testing (SAST)
* **Herramienta:** GitHub CodeQL (`javascript-typescript`).
* **Alineación NIST SSDF:** *Produce Well-Secured Software (PW.7.2)*.
* **Función:** Analiza el código fuente línea por línea en cada `push` y `pull_request` para detectar fallos de lógica y vulnerabilidades críticas (inyección de comandos, SSRF, XSS, Path Traversal) antes de integrar cambios.

### 2. Software Composition Analysis (SCA) & Supply Chain Compliance
* **Herramienta:** Trivy (Aqua Security).
* **Alineación NIST SSDF:** *Produce Well-Secured Software (PW.4.4)* y *Protect the Software (PS.3.2)*.
* **Función:** Escanea el árbol de dependencias (`package.json` / `package-lock.json`) para identificar componentes de terceros con vulnerabilidades públicas conocidas (CVEs de severidad `HIGH` y `CRITICAL`).
* **Entregable Normativo:** Genera automáticamente un inventario **SBOM (Software Bill of Materials)** en formato estándar **CycloneDX** (`sbom-fintech-cyclonedx`) como artefacto descargable para auditoría en cada ejecución.

### 3. Secret Scanning Enforcement
* **Herramienta:** Gitleaks (`--no-git`).
* **Alineación NIST SSDF:** *Produce Well-Secured Software (PW.6.2)*.
* **Función:** Audita el estado actual de los archivos del commit en busca de llaves criptográficas, *tokens* de acceso o credenciales expuestas en texto plano, provocando la falla inmediata del *job* (`exit code 1`) ante cualquier fuga detectada.
### 🔄 Flujo de Ejecución del Pipeline y Quality Gates

```text
[Push / Pull Request hacia main]
       │
       ├──► 1. SAST (CodeQL) ───────────────► NIST PW.7.2: Análisis estático (JS/TS)
       ├──► 2. SCA & SBOM (Trivy) ──────────► NIST PW.4.4 / PS.3.2: CVEs (HIGH/CRITICAL) + CycloneDX SBOM
       ├──► 3. Secretos (Gitleaks) ─────────► NIST PW.6.2: Escaneo de credenciales en el commit (--no-git)
       │
       ▼
[Quality Gate Enforcement & Protección de Ramas (NIST PO.1.2 / PS.1.1)]
       ├──► Hallazgos detectados ───────────► ❌ Falla del job (exit 1) y bloqueo automático del PR
       └──► Validación limpia ──────────────► ✅ Aprobación de status checks para Merge en `main`
```
---

## 🚦 Gobernanza del Repositorio (Branch Protection & Quality Gates)

Alineado con los dominios **PO.1.2 / PO.3.2** y **PS.1.1** del NIST SSDF, la rama principal (`main`) está protegida bajo reglas estrictas de control:

* Los *pushes* directos a `main` están bloqueados; todo cambio ingresa mediante ramas `feature/*` y Pull Request.
* **Quality Gates Automatizados:** La fusión de un Pull Request se bloquea automáticamente si cualquiera de los tres *status checks* obligatorios (`1. SAST (CodeQL)`, `2. SCA & SBOM (Trivy)` o `3. Secretos (Gitleaks)`) detecta hallazgos por encima del umbral permitido y finaliza con error.

---

## 📊 Matriz de Trazabilidad NIST SP 800-218 (SSDF)

| Dominio NIST SSDF | Práctica / Tarea | Control Implementado | Evidencia en el Repositorio |
| :--- | :--- | :--- | :--- |
| **PO: Prepare the Organization** | **PO.1.2 / PO.3.2** | Reglas de protección de rama y automatización de *Quality Gates* en CI/CD. | Bloqueo nativo de *Merge* ante fallos en GitHub Actions. |
| **PS: Protect the Software** | **PS.1.1 / PS.3.2** | Control de cambios vía PR y emisión continua de **CycloneDX SBOM**. | Artefacto `sbom-fintech-cyclonedx` (`sbom-cyclonedx.json`). |
| **PW: Produce Well-Secured Software** | **PW.4.4 / PW.6.2 / PW.7.2** | Ejecución secuencial de **Trivy (SCA)**, **Gitleaks (Secretos)** y **CodeQL (SAST)**. | Reportes SARIF y resúmenes en `$GITHUB_STEP_SUMMARY`. |
| **RV: Respond to Vulnerabilities** | **RV.1.1** | Identificación continua y centralización de alertas antes de liberar código. | Panel consolidado en la pestaña **Security**. |

---

## 📸 Telemetría del Pipeline y Evidencia de Auditoría

### 1. Ejecución de Quality Gates y Resumen de Hallazgos (`$GITHUB_STEP_SUMMARY`)
Evidencia del análisis automatizado y bloqueo preventivo ante detección de dependencias vulnerables (`HIGH`) y credenciales expuestas en el código fuente:

<img width="607" height="279" alt="image" src="https://github.com/user-attachments/assets/b5277bdb-4e64-43cb-9420-c3ee25ca6292" />
<img width="600" height="588" alt="image" src="https://github.com/user-attachments/assets/e5e4b49b-637b-4f5f-a7b0-a331ab8766be" />
<img width="409" height="139" alt="image" src="https://github.com/user-attachments/assets/0a515b6b-e51a-47a1-9f70-f0e9a04860e3" />

### 2. Gobernanza y Control de Merge en Pull Requests (NIST PO.1.2 / PS.1.1)
Validación de las reglas de protección de rama (`Required` checks): bloqueo preventivo del botón *Merge* mientras los controles evalúan el cambio y habilitación automática tras aprobar sin hallazgos críticos:

<img width="496" height="451" alt="image" src="https://github.com/user-attachments/assets/46e357bd-a792-417d-ab35-6843d36c47fa" />

### 3. Aprobación Final y Ejecución Limpia del Pipeline (`All checks have passed`)
Una vez remediados los hallazgos, los 3 *jobs* secuenciales (`CodeQL`, `Trivy` y `Gitleaks`) completan en verde y GitHub habilita automáticamente la fusión hacia `main`:

<img width="731" height="225" alt="image" src="https://github.com/user-attachments/assets/a5143016-8b03-41dd-a672-f66f678416a2" />
<img width="510" height="271" alt="image" src="https://github.com/user-attachments/assets/fe5a98e8-69e5-4d32-8551-60cff3626e27" />





---

## 📈 Resultados del Laboratorio y Logs de Auditoría
Para auditar en tiempo real los hallazgos generados por el pipeline, navega directamente a las pestañas **[Security](../../security/code-scanning)** y **[Actions](../../actions)** de este repositorio, donde se consolidan las alertas SARIF, los resúmenes de ejecución y los artefactos SBOM descargables.

---

## 👤 Autor
* **José Villanueva** - Cybersecurity Specialist
