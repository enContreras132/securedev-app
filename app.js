// APP INTENCIONALMENTE VULNERABLE - SOLO PARA FINES EDUCATIVOS (OCY1102)
// No desplegar en internet.
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const client = require('prom-client');

const app = express();
const API_KEY = 'sk-live-1234567890abcdef'; // VULN: secreto hardcodeado
const db = new sqlite3.Database(':memory:');
client.collectDefaultMetrics();

db.serialize(() => {
  db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password TEXT)');
  db.run("INSERT INTO users (name,email,password) VALUES ('admin','admin@securedev.cl','admin123')");
  db.run("INSERT INTO users (name,email,password) VALUES ('ana','ana@securedev.cl','ana2024')");
});

app.get('/', (req, res) => {
  res.cookie('session', 'abc123'); // VULN: cookie sin HttpOnly/SameSite
  res.send(`<h1>SecureDev App</h1>
  <ul>
    <li><a href="/search?q=hola">Buscar</a></li>
    <li><a href="/user?id=1">Usuario</a></li>
    <li><a href="/ping?host=localhost">Ping</a></li>
    <li><a href="/file?name=readme.txt">Archivo</a></li>
  </ul>
  <form action="/search" method="get"><input name="q"><button>Buscar</button></form>`);
});

// VULN: XSS reflejado
app.get('/search', (req, res) => {
  res.send('<h2>Resultados para: ' + req.query.q + '</h2>');
});

// VULN: inyección SQL
app.get('/user', (req, res) => {
  db.get('SELECT id,name,email FROM users WHERE id = ' + req.query.id, (err, row) => {
    if (err) return res.status(500).send(err.message); // VULN: filtra errores internos
    res.json(row || {});
  });
});

// VULN: inyección de comandos
app.get('/ping', (req, res) => {
  exec('ping -c 1 ' + req.query.host, (err, stdout, stderr) => {
    res.type('text').send(stdout || stderr || String(err));
  });
});

// VULN: path traversal
app.get('/file', (req, res) => {
  fs.readFile(path.join(__dirname, 'files', req.query.name), 'utf8', (err, data) => {
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
