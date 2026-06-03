const { db } = require('../models/dbInit');

// Tasarruf Hedeflerini Getir
exports.getSavingsGoals = (req, res) => {
  const userId = req.user.id;

  const query = `SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC`;
  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Tasarruf hedefleri yüklenirken hata oluştu.' });
    }
    res.status(200).json({ savingsGoals: rows });
  });
};

// Tasarruf Hedefi Ekle
exports.addSavingsGoal = (req, res) => {
  const userId = req.user.id;
  const { title, target_amount, current_amount, deadline } = req.body;

  if (!title || !target_amount) {
    return res.status(400).json({ error: 'Başlık (title) ve hedef miktar (target_amount) zorunludur.' });
  }

  const current = current_amount || 0;

  const query = `
    INSERT INTO savings_goals (user_id, title, target_amount, current_amount, deadline)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [userId, title, target_amount, current, deadline], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Tasarruf hedefi eklenirken hata oluştu.' });
    }
    res.status(201).json({
      message: 'Tasarruf hedefi başarıyla oluşturuldu.',
      savingsGoal: {
        id: this.lastID,
        user_id: userId,
        title,
        target_amount,
        current_amount: current,
        deadline,
        created_at: new Date()
      }
    });
  });
};

// Tasarruf Hedefi Birikimini Güncelle (Para Ekle / Çıkar)
exports.updateSavingsProgress = (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { amount } = req.body; // eklenecek veya güncellenecek miktar

  if (amount === undefined) {
    return res.status(400).json({ error: 'Güncellenecek miktar gereklidir.' });
  }

  // Önce mevcut miktarı getirip üzerine ekleyelim veya doğrudan yeni miktar set edelim.
  // Bu uçta üzerine ekleme yapmayı tercih ediyoruz.
  const selectQuery = `SELECT current_amount, target_amount FROM savings_goals WHERE id = ? AND user_id = ?`;
  db.get(selectQuery, [id, userId], (err, goal) => {
    if (err) {
      return res.status(500).json({ error: 'Tasarruf hedefi kontrol edilemedi.' });
    }
    if (!goal) {
      return res.status(404).json({ error: 'Tasarruf hedefi bulunamadı.' });
    }

    const newAmount = goal.current_amount + Number(amount);

    const updateQuery = `UPDATE savings_goals SET current_amount = ? WHERE id = ? AND user_id = ?`;
    db.run(updateQuery, [newAmount, id, userId], function (err) {
      if (err) {
        return res.status(500).json({ error: 'İlerleme güncellenirken hata oluştu.' });
      }

      let completionAlert = null;
      if (newAmount >= goal.target_amount) {
        completionAlert = {
          title: 'Tebrikler! 🎉',
          message: `"${goal.title}" hedefinize ulaştınız! Başarıyla ${goal.target_amount} TL biriktirdiniz.`
        };
      }

      res.status(200).json({
        message: 'Tasarruf ilerlemesi güncellendi.',
        current_amount: newAmount,
        alert: completionAlert
      });
    });
  });
};

// Tasarruf Hedefini Sil
exports.deleteSavingsGoal = (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const query = `DELETE FROM savings_goals WHERE id = ? AND user_id = ?`;
  db.run(query, [id, userId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Tasarruf hedefi silinirken hata oluştu.' });
    }
    res.status(200).json({ message: 'Tasarruf hedefi başarıyla silindi.' });
  });
};
