const express = require('express');
const { execFile } = require('child_process'); // Reemplazado exec por execFile para mitigar command injection básica
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
// 1. EXPOSICIÓN DE SECRETOS (Mapeado a Variables de Entorno)
// =========================================================================
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const STRIPE_LIVE_SECRET = process.env.STRIPE_LIVE_SECRET || "";
const GITHUB_INTEGRATION_TOKEN = process.env.GITHUB_INTEGRATION_TOKEN || "";
const JWT_SIGNING_SECRET = process.env.JWT_SIGNING_SECRET || "fallback-secret-key";

// =========================================================================
// 2. INYECCIÓN DE COMANDOS - Mitigación con execFile y validación
// =========================================================================
app.get('/api/v1/nodes/ping', (req, res) => {
  const gatewayHost = req.query.host;
  
  // Validación básica de formato de host/IP para prevenir inyección directa
  if (!gatewayHost || typeof gatewayHost !== 'string' || !/^[\w.-]+$/.test(gatewayHost)) {
    return res.status(400).send('Parámetro host inválido');
  }

  // execFile evita la ejecución a través de un intérprete de comandos shell
  execFile('ping', ['-c', '2', gatewayHost], (error, stdout, stderr) => {
    if (error) return res.status(500).send(stderr);
    res.send(stdout);
  });
});

// =========================================================================
// 3. PATH TRAVERSAL / LECTURA ARBITRARIA DE ARCHivos (Validación de ruta)
// =========================================================================
app.get('/api/v1/invoices/download', (req, res) => {
  const receiptFile = req.query.file;
  
  if (!receiptFile || typeof receiptFile !== 'string') {
    return res.status(400).send('Nombre de archivo inválido');
  }

  const receiptsDir = path.join(__dirname, 'receipts');
  const filePath = path.join(receiptsDir, path.basename(receiptFile)); // path.basename previene Directory Traversal (../)

  // Validar que el archivo resida estrictamente dentro del directorio permitido
  if (!filePath.startsWith(receiptsDir)) {
    return res.status(403).send('Acceso denegado');
  }

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('Comprobante de pago no encontrado');
    res.send(data);
  });
});

// =========================================================================
// 4. SERVER-SIDE REQUEST FORGERY - SSRF (Validación de esquemas/URL)
// =========================================================================
app.post('/api/v1/payments/webhook-verify', async (req, res) => {
  const merchantCallbackUrl = req.body.url;
  
  try {
    const parsedUrl = new URL(merchantCallbackUrl);
    // Permitir únicamente protocolos seguros en producción
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return res.status(400).json({ error: 'Esquema de URL no permitido' });
    }

    const response = await axios.get(merchantCallbackUrl);
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
  // Se previene XSS asegurando que no se inyecte HTML plano directamente sin sanitizar
  const sanitizedAlias = String(walletAlias).replace(/[<>]/g, '');
  res.send(`<h1>Resultados de búsqueda para la billetera: ${sanitizedAlias}</h1>`);
});

// =========================================================================
// 6. EJECUCIÓN DINÁMICA DE CÓDIGO - Code Injection (Eliminación de eval)
// =========================================================================
app.post('/api/v1/microcredits/simulate', (req, res) => {
  const { principal, rate, months } = req.body;
  
  // Reemplazo seguro de eval por una fórmula matemática controlada y predecible
  if (typeof principal !== 'number' || typeof rate !== 'number' || typeof months !== 'number') {
    return res.status(400).json({ error: 'Parámetros numéricos inválidos para la simulación' });
  }

  const installment = (principal * (1 + rate / 100)) / months;
  res.json({ cuotaCalculada: installment });
});

app.get('/health', (req, res) => {
  const token = jwt.sign({ service: 'fintech-payments-api' }, JWT_SIGNING_SECRET, { expiresIn: '1h' });
  res.json({ status: 'UP', sessionToken: token });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fintech Payments API ejecutándose en el puerto ${PORT}`);
});