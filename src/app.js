const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const _ = require('lodash');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

// =========================================================================
// CONTROL DE TASA (Rate Limiting) - Mitigación para CodeQL (missing-rate-limiting)
// =========================================================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde.' }
});

// Aplicar rate-limiting global a las rutas de la API
app.use('/api/', apiLimiter);

// =========================================================================
// 1. EXPOSICIÓN DE SECRETOS (Mapeado a Variables de Entorno con exclusión gitleaks)
// =========================================================================
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const STRIPE_LIVE_SECRET = process.env.STRIPE_LIVE_SECRET || ""; // gitleaks:allow
const GITHUB_INTEGRATION_TOKEN = process.env.GITHUB_INTEGRATION_TOKEN || ""; // gitleaks:allow
const JWT_SIGNING_SECRET = process.env.JWT_SIGNING_SECRET || "fallback-secret-key";

// =========================================================================
// 2. INYECCIÓN DE COMANDOS - Mitigación con execFile y validación
// =========================================================================
app.get('/api/v1/nodes/ping', (req, res) => {
  const gatewayHost = req.query.host;
  
  if (!gatewayHost || typeof gatewayHost !== 'string' || !/^[\w.-]+$/.test(gatewayHost)) {
    return res.status(400).send('Parámetro host inválido');
  }

  execFile('ping', ['-c', '2', gatewayHost], (error, stdout, stderr) => {
    if (error) return res.status(500).send(stderr);
    res.send(stdout);
  });
});

// =========================================================================
// 3. PATH TRAVERSAL / LECTURA ARBITRARIA DE ARCHIVOS (Validación de ruta)
// =========================================================================
app.get('/api/v1/invoices/download', (req, res) => {
  const receiptFile = req.query.file;
  
  if (!receiptFile || typeof receiptFile !== 'string') {
    return res.status(400).send('Nombre de archivo inválido');
  }

  const receiptsDir = path.join(__dirname, 'receipts');
  const filePath = path.join(receiptsDir, path.basename(receiptFile));

  if (!filePath.startsWith(receiptsDir)) {
    return res.status(403).send('Acceso denegado');
  }

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('Comprobante de pago no encontrado');
    res.send(data);
  });
});

// =========================================================================
// 4. SERVER-SIDE REQUEST FORGERY - SSRF (Validación de esquemas y allowlist)
// =========================================================================
const ALLOWED_WEBHOOK_HOSTS = new Map([
  ['api.comercio-aliado.com', 'https://api.comercio-aliado.com'],
  ['webhooks.fintech-sandbox.com', 'https://webhooks.fintech-sandbox.com']
]);

app.post('/api/v1/payments/webhook-verify', async (req, res) => {
  const merchantCallbackUrl = req.body.url;
  
  try {
    const parsedUrl = new URL(merchantCallbackUrl);
    if (parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Solo se permiten conexiones HTTPS' });
    }

    const baseOrigin = ALLOWED_WEBHOOK_HOSTS.get(parsedUrl.hostname);
    if (!baseOrigin) {
      return res.status(403).json({ error: 'Dominio de webhook no autorizado en la lista blanca' });
    }

    const response = await axios.get(`${baseOrigin}/webhook/status`);
    res.json({ status: 'Webhook de comercio activo', data: response.data });
  } catch (error) {
    res.status(400).json({ error: 'URL inválida o no se pudo contactar el endpoint' });
  }
});

// =========================================================================
// 5. CROSS-SITE SCRIPTING REFLEJADO - XSS (Escapado de salida)
// =========================================================================
app.get('/api/v1/wallets/search', (req, res) => {
  const walletAlias = req.query.alias || '';
  const sanitizedAlias = String(walletAlias).replace(/[<>]/g, '');
  res.send(`<h1>Resultados de búsqueda para la billetera: ${sanitizedAlias}</h1>`);
});

// =========================================================================
// 6. EJECUCIÓN DINÁMICA DE CÓDIGO - Code Injection (Eliminación de eval)
// =========================================================================
app.post('/api/v1/microcredits/simulate', (req, res) => {
  const { principal, rate, months } = req.body;
  
  if (typeof principal !== 'number' || typeof rate !== 'number' || typeof months !== 'number') {
    return res.status(400).json({ error: 'Parámetros numéricos inválidos para la simulación' });
  }

  const installment
