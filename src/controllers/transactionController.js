const { db } = require('../models/dbInit');

// İşlemleri Getir (Gelir ve Giderler)
exports.getTransactions = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT * FROM transactions 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'İşlemler yüklenirken bir hata oluştu.' });
    }
    res.status(200).json({ transactions: rows });
  });
};

// Yeni İşlem Ekle (Gelir / Gider)
exports.addTransaction = (req, res) => {
  const userId = req.user.id;
  const { type, amount, category, description, is_impulsive } = req.body;

  if (!type || !amount || !category) {
    return res.status(400).json({ error: 'Tür (type), miktar (amount) ve kategori (category) zorunludur.' });
  }

  const isImpulsiveValue = is_impulsive ? 1 : 0;

  const insertQuery = `
    INSERT INTO transactions (user_id, type, amount, category, description, is_impulsive) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(insertQuery, [userId, type, amount, category, description, isImpulsiveValue], function (err) {
    if (err) {
      return res.status(500).json({ error: 'İşlem kaydedilirken bir hata oluştu.' });
    }

    const newTransactionId = this.lastID;
    
    // Gider kontrolü ve limit aşım analizleri
    if (type === 'expense') {
      // 1. Kategorinin bütçe limitini kontrol et
      const budgetQuery = `SELECT monthly_limit FROM budgets WHERE user_id = ? AND category = ?`;
      db.get(budgetQuery, [userId, category], (err, budget) => {
        if (err) {
          return res.status(500).json({ error: 'Bütçe kontrolü yapılamadı.' });
        }

        // Cari aydaki bu kategoriye ait toplam harcamayı getir
        const totalExpenseQuery = `
          SELECT SUM(amount) as total FROM transactions 
          WHERE user_id = ? AND type = 'expense' AND category = ? 
          AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `;

        db.get(totalExpenseQuery, [userId, category], (err, expenseResult) => {
          if (err) {
            return res.status(500).json({ error: 'Aylık harcama hesaplanamadı.' });
          }

          const currentMonthTotal = expenseResult.total || 0;
          let alert = null;

          if (budget && currentMonthTotal > budget.monthly_limit) {
            alert = {
              type: 'BUDGET_EXCEEDED',
              title: 'Bütçe Limiti Aşıldı! 🚨',
              message: `"${category}" kategorisindeki aylık harcamanız (${currentMonthTotal} TL), belirlediğiniz limiti (${budget.monthly_limit} TL) aştı! "Elim cebimde" asistanınız harcamayı durdurmanızı öneriyor.`
            };
          } else if (isImpulsiveValue === 1) {
            alert = {
              type: 'IMPULSIVE_SPENDING_WARNING',
              title: 'Dürtüsel Harcama Uyarısı! 💸',
              message: `Bu harcamayı "dürtüsel" (plansız) olarak kaydettiniz. Unutmayın, ufak dürtüsel harcamalar ay sonunda büyük bütçe açıklarına neden olur.`
            };
          }

          res.status(201).json({
            message: 'İşlem başarıyla eklendi.',
            transaction: {
              id: newTransactionId,
              user_id: userId,
              type,
              amount,
              category,
              description,
              is_impulsive: isImpulsiveValue,
              created_at: new Date()
            },
            alert
          });
        });
      });
    } else {
      // Gelir eklendiğinde uyarı gönderme
      res.status(201).json({
        message: 'İşlem başarıyla eklendi.',
        transaction: {
          id: newTransactionId,
          user_id: userId,
          type,
          amount,
          category,
          description,
          is_impulsive: isImpulsiveValue,
          created_at: new Date()
        },
        alert: null
      });
    }
  });
};

// İşlem Sil (Opsiyonel API)
exports.deleteTransaction = (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const query = `DELETE FROM transactions WHERE id = ? AND user_id = ?`;
  db.run(query, [id, userId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'İşlem silinirken hata oluştu.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Silinecek işlem bulunamadı.' });
    }
    res.status(200).json({ message: 'İşlem başarıyla silindi.' });
  });
};
