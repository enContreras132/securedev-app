// VERSIÓN CORREGIDA (reemplaza app.js en la raíz)
const express = require('express');
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const client = require('prom-client');

const app = express();
const API_KEY = process.env.API_KEY; // FIX: secreto desde variable de entorno
const FILES_DIR = path.join(__dirname, 'files');
const db = new sqlite3.Database(':memory:');
client.collectDefaultMetrics();
app.use(helmet()); // FIX: cabeceras de seguridad, oculta X-Powered-By

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

db.serialize(() => {
  db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password TEXT)');
  db.run("INSERT INTO users (name,email,password) VALUES ('admin','admin@securedev.cl','admin123')");
  db.run("INSERT INTO users (name,email,password) VALUES ('ana','ana@securedev.cl','ana2024')");
});

app.get('/', (req, res) => {
  res.cookie('session', 'abc123', { httpOnly: true, sameSite: 'strict' }); // FIX
  res.send(`<h1>SecureDev App</h1>
  <ul>
    <li><a href="/search?q=hola">Buscar</a></li>
    <li><a href="/user?id=1">Usuario</a></li>
    <li><a href="/ping?host=localhost">Ping</a></li>
    <li><a href="/file?name=readme.txt">Archivo</a></li>
  </ul>
  <form action="/search" method="get"><input name="q"><button>Buscar</button></form>`);
});

// FIX: salida escapada (XSS)
app.get('/search', (req, res) => {
  res.send('<h2>Resultados para: ' + escapeHtml(req.query.q || '') + '</h2>');
});

// FIX: consulta parametrizada (SQLi) y error genérico
app.get('/user', (req, res) => {
  const id = Number.parseInt(req.query.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });
  db.get('SELECT id,name,email FROM users WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    res.json(row || {});
  });
});

// FIX: validación + execFile sin shell (inyección de comandos)
app.get('/ping', (req, res) => {
  const host = String(req.query.host || '');
  if (!/^[a-zA-Z0-9.-]{1,253}$/.test(host)) return res.status(400).send('Host inválido');
  execFile('ping', ['-c', '1', host], (err, stdout, stderr) => {
    res.type('text').send(stdout || stderr || 'Error');
  });
});

// FIX: solo el nombre base del archivo (path traversal)
app.get('/file', (req, res) => {
  const name = path.basename(String(req.query.name || ''));
  fs.readFile(path.join(FILES_DIR, name), 'utf8', (err, data) => {
    if (err) return res.status(404).send('No encontrado');
    res.type('text').send(data);
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/hello', (req, res) => res.send(_.capitalize('hola desde securedev')));

module.exports = app;
if (require.main === module) {
  app.listen(3000, () => console.log('App en puerto 3000'));
}
