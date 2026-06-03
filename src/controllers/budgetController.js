const { db } = require('../models/dbInit');

// Bütçe Limitlerini Getir
exports.getBudgets = (req, res) => {
  const userId = req.user.id;

  const query = `SELECT * FROM budgets WHERE user_id = ?`;
  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Bütçe limitleri yüklenirken hata oluştu.' });
    }
    res.status(200).json({ budgets: rows });
  });
};

// Bütçe Limiti Belirle veya Güncelle
exports.setBudget = (req, res) => {
  const userId = req.user.id;
  const { category, monthly_limit } = req.body;

  if (!category || monthly_limit === undefined || monthly_limit < 0) {
    return res.status(400).json({ error: 'Kategori ve geçerli bir bütçe limiti gereklidir.' });
  }

  // SQLite ON CONFLICT kullanarak bütçeyi ekle veya güncelle
  const query = `
    INSERT INTO budgets (user_id, category, monthly_limit)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, category) 
    DO UPDATE SET monthly_limit = excluded.monthly_limit
  `;

  db.run(query, [userId, category, monthly_limit], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Bütçe kaydedilirken hata oluştu.' });
    }
    res.status(200).json({
      message: 'Bütçe limiti başarıyla güncellendi.',
      budget: {
        user_id: userId,
        category,
        monthly_limit
      }
    });
  });
};

// Bütçe Limiti Kaldır (Opsiyonel)
exports.deleteBudget = (req, res) => {
  const userId = req.user.id;
  const { category } = req.body;

  if (!category) {
    return res.status(400).json({ error: 'Silinecek kategori belirtilmelidir.' });
  }

  const query = `DELETE FROM budgets WHERE user_id = ? AND category = ?`;
  db.run(query, [userId, category], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Bütçe silinirken hata oluştu.' });
    }
    res.status(200).json({ message: 'Bütçe limiti başarıyla kaldırıldı.' });
  });
};
