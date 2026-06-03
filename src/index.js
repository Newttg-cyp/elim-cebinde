require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./models/dbInit');

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Veritabanı tablolarını başlat
initDb();

// Middleware'ler
app.use(cors());
app.use(express.json());

// API Rotası Tanımlamaları
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/ai', aiRoutes);

// Kök Dizin Kontrolü
app.get('/', (req, res) => {
  res.json({
    message: 'Elim Cebimde AI Finansal Disiplin Asistanı API Sunucusuna Hoş Geldiniz.',
    version: '1.0.0-MVP',
    status: 'Running'
  });
});

// Sunucuyu Başlat
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
