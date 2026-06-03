const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../models/dbInit');

const JWT_SECRET = process.env.JWT_SECRET || 'elim_cebimde_gizli_anahtar_9876';

// Kullanıcı Kaydı (Register)
exports.register = (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
  }

  // Şifreyi tuzlama
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const query = `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`;
  db.run(query, [name, email, passwordHash], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda.' });
      }
      return res.status(500).json({ error: 'Kullanıcı kaydı sırasında bir hata oluştu.' });
    }

    // JWT token oluşturma
    const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Kullanıcı başarıyla kaydedildi.',
      token,
      user: {
        id: this.lastID,
        name,
        email
      }
    });
  });
};

// Kullanıcı Girişi (Login)
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre gereklidir.' });
  }

  const query = `SELECT * FROM users WHERE email = ?`;
  db.get(query, [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Giriş işlemi sırasında hata oluştu.' });
    }

    if (!user) {
      return res.status(400).json({ error: 'Geçersiz e-posta veya şifre.' });
    }

    // Şifre kontrolü
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Geçersiz e-posta veya şifre.' });
    }

    // JWT token oluşturma
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Giriş başarılı.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  });
};

// Kimlik Doğrulama Middleware (Auth Middleware)
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Kimlik doğrulama tokenı bulunamadı.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token.' });
    }
    req.user = decodedUser;
    next();
  });
};
