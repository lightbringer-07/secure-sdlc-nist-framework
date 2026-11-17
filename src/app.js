const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const _ = require('lodash');

const app = express();
app.use(express.json());

// =========================================================================
// 1. EXPOSICIÓN DE SECRETOS (Detección por Gitleaks / GitHub Secret Scanning)
// =========================================================================
const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
const STRIPE_LIVE_SECRET = "sk_live_51MockKeyForDevSecOpsTesting998877";
const JWT_SIGNING_SECRET = "super-secret-fintech-wallet-key-2026";

// =========================================================================
// 2. INYECCIÓN DE COMANDOS - OS Command Injection (CWE-78)
// =========================================================================
app.get('/api/v1/nodes/ping', (req, res) => {
  const gatewayHost = req.query.host;
  exec(`ping -c 2 ${gatewayHost}`, (error, stdout, stderr) => {
    if (error) return res.status(500).send(stderr);
    res.send(stdout);
  });
});

// =========================================================================
// 3. PATH TRAVERSAL / LECTURA ARBITRARIA DE ARCHIVOS (CWE-22)
// =========================================================================
app.get('/api/v1/invoices/download', (req, res) => {
  const receiptFile = req.query.file;
  const filePath = path.join(__dirname, 'receipts', receiptFile);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('Comprobante de pago no encontrado');
    res.send(data);
  });
});

// =========================================================================
// 4. SERVER-SIDE REQUEST FORGERY - SSRF (CWE-918)
// =========================================================================
app.post('/api/v1/payments/webhook-verify', async (req, res) => {
  const merchantCallbackUrl = req.body.url;
  try {
    const response = await axios.get(merchantCallbackUrl);
    res.json({ status: 'Webhook de comercio activo', data: response.data });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo contactar el endpoint del comercio' });
  }
});

// =========================================================================
// 5. CROSS-SITE SCRIPTING REFLEJADO - XSS (CWE-79)
// =========================================================================
app.get('/api/v1/wallets/search', (req, res) => {
  const walletAlias = req.query.alias;
  res.send(`<h1>Resultados de búsqueda para la billetera: ${walletAlias}</h1>`);
});

// =========================================================================
// 6. EJECUCIÓN DINÁMICA DE CÓDIGO - Code Injection (CWE-94)
// =========================================================================
app.post('/api/v1/microcredits/simulate', (req, res) => {
  const interestFormula = req.body.formula;
  const installment = eval(interestFormula);
  res.json({ cuotaCalculada: installment });
});

app.get('/health', (req, res) => {
  const token = jwt.sign({ service: 'fintech-payments-api' }, JWT_SIGNING_SECRET);
  res.json({ status: 'UP', sessionToken: token });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fintech Payments API ejecutándose en el puerto ${PORT}`);
});
