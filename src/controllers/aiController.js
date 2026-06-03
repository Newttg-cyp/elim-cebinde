const { db } = require('../models/dbInit');

// Yapay Zeka Finansal Durum Analizi ve Öneriler
exports.getFinancialAnalysis = (req, res) => {
  const userId = req.user.id;

  // 1. İşlemleri getir
  const transactionsQuery = `SELECT * FROM transactions WHERE user_id = ?`;
  const budgetsQuery = `SELECT * FROM budgets WHERE user_id = ?`;
  const savingsQuery = `SELECT * FROM savings_goals WHERE user_id = ?`;

  db.all(transactionsQuery, [userId], (err, transactions) => {
    if (err) return res.status(500).json({ error: 'Veriler analiz edilirken hata oluştu.' });

    db.all(budgetsQuery, [userId], (err, budgets) => {
      if (err) return res.status(500).json({ error: 'Bütçe verileri analiz edilemedi.' });

      db.all(savingsQuery, [userId], (err, savings) => {
        if (err) return res.status(500).json({ error: 'Tasarruf verileri analiz edilemedi.' });

        // İstatistikleri hesapla
        let totalIncome = 0;
        let totalExpense = 0;
        let impulsiveExpense = 0;
        const categoryExpenses = {};

        transactions.forEach(t => {
          if (t.type === 'income') {
            totalIncome += t.amount;
          } else {
            totalExpense += t.amount;
            if (t.is_impulsive) {
              impulsiveExpense += t.amount;
            }
            categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
          }
        });

        // Bütçe aşım durumunu kontrol et
        const budgetAlerts = [];
        budgets.forEach(b => {
          const currentSpent = categoryExpenses[b.category] || 0;
          if (currentSpent > b.monthly_limit) {
            budgetAlerts.push({
              category: b.category,
              limit: b.monthly_limit,
              spent: currentSpent,
              over: currentSpent - b.monthly_limit
            });
          }
        });

        // Dürtüsellik Skoru (0-100)
        const totalExpensesCount = transactions.filter(t => t.type === 'expense').length;
        const impulsiveCount = transactions.filter(t => t.type === 'expense' && t.is_impulsive === 1).length;
        const impulsivityScore = totalExpensesCount > 0 ? Math.round((impulsiveCount / totalExpensesCount) * 100) : 0;

        // Yapay zeka tavsiyeleri oluştur (Kullanıcı verilerine göre dinamik)
        const recommendations = [];

        if (impulsiveExpense > 0) {
          recommendations.push(
            `Bu ay toplam ${impulsiveExpense} TL değerinde plansız (dürtüsel) harcama yaptınız. Bu tutarla en azından bir tasarruf hedefinize katkı sağlayabilirdiniz. Alışveriş yapmadan önce 24 saat bekleme kuralını uygulayın.`
          );
        } else {
          recommendations.push(
            `Harika! Bu ay hiç dürtüsel harcama kaydetmediniz. Finansal disiplininiz oldukça yüksek.`
          );
        }

        if (budgetAlerts.length > 0) {
          budgetAlerts.forEach(alert => {
            recommendations.push(
              `DİKKAT: "${alert.category}" kategorisinde bütçe sınırınızı ${alert.over} TL aştınız. Önümüzdeki günlerde bu kategorideki harcamaları askıya almanız yararınıza olacaktır.`
            );
          });
        }

        if (totalIncome > 0 && totalExpense / totalIncome > 0.8) {
          recommendations.push(
            `Gelirinizin %${Math.round((totalExpense / totalIncome) * 100)}'ini harcadınız. Güvenli bölgede kalmak için harcamalarınızı gelirinizin %70'inin altında tutmaya çalışın.`
          );
        }

        if (savings.length > 0) {
          const closeToGoal = savings.find(s => (s.current_amount / s.target_amount) >= 0.8 && s.current_amount < s.target_amount);
          if (closeToGoal) {
            recommendations.push(
              `"${closeToGoal.title}" tasarruf hedefinizi gerçekleştirmeye çok yakınsınız! Sadece %${Math.round((1 - (closeToGoal.current_amount / closeToGoal.target_amount)) * 100)} daha biriktirmeniz gerekiyor. Harcamalarınızdan ufak bir kısıntı hedefe ulaşmanızı sağlayabilir.`
            );
          }
        } else {
          recommendations.push(
            `Henüz aktif bir tasarruf hedefi belirlememişsiniz. Finansal motivasyonunuzu artırmak için küçük bir birikim hedefi oluşturun.`
          );
        }

        // Yatırım/Birikim Önerisi
        if (totalIncome - totalExpense > 500) {
          const surplus = totalIncome - totalExpense;
          recommendations.push(
            `Boşta kalan ${surplus} TL bakiyeniz bulunuyor. Bu tutarı enflasyon karşısında korumak adına altın, vadeli mevduat veya fon yatırımlarında değerlendirebilirsiniz.`
          );
        }

        res.status(200).json({
          stats: {
            totalIncome,
            totalExpense,
            impulsiveExpense,
            impulsivityScore,
            balance: totalIncome - totalExpense
          },
          budgetAlerts,
          categoryExpenses,
          recommendations
        });
      });
    });
  });
};

// Yapay Zeka ile Chatbot Sohbeti (AI Chat Assistant)
exports.chatWithAI = (req, res) => {
  const userId = req.user.id;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mesaj alanı boş bırakılamaz.' });
  }

  // Kullanıcının mevcut finansal durumunu getirip bota bağlam ekleyelim
  const summaryQuery = `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
      SUM(CASE WHEN type = 'expense' AND is_impulsive = 1 THEN amount ELSE 0 END) as impulsive_expense
    FROM transactions 
    WHERE user_id = ?
  `;

  db.get(summaryQuery, [userId], (err, summary) => {
    if (err) return res.status(500).json({ error: 'Finansal özet getirilemedi.' });

    const income = summary.total_income || 0;
    const expense = summary.total_expense || 0;
    const impulsive = summary.impulsive_expense || 0;
    const balance = income - expense;

    // Basit bir kural tabanlı dinamik finansal asistan yanıt sistemi (NLP / LLM benzeri)
    let aiResponse = "";
    const msgLower = message.toLowerCase();

    if (msgLower.includes('merhaba') || msgLower.includes('selam')) {
      aiResponse = `Merhaba! Ben Elim Cebimde Finansal Asistanınızım. Harcamalarınızı kontrol altına almanıza, tasarruf yapmanıza ve dürtüsel alışverişlerinizi önlemenize yardımcı olabilirim. Nasıl yardımcı olabilirim?`;
    } else if (msgLower.includes('durum') || msgLower.includes('özet') || msgLower.includes('bütçe')) {
      aiResponse = `Mevcut finansal özetiniz şu şekilde:\n💵 Toplam Gelir: ${income} TL\n💸 Toplam Harcama: ${expense} TL\n⚠️ Dürtüsel Harcama: ${impulsive} TL\n⚖️ Net Bakiye: ${balance} TL.\n${balance < 0 ? 'Şu anda içeridesiniz! Lütfen harcamaları azaltmaya odaklanın.' : 'Şu anda bakiyeniz artıda, birikim hedeflerinize para aktarabilirsiniz.'}`;
    } else if (msgLower.includes('dürtüsel') || msgLower.includes('harcama kontrolü') || msgLower.includes('para harcıyorum')) {
      aiResponse = `Dürtüsel harcamalarınız ${impulsive} TL'yi bulmuş. Alışveriş yapmadan önce şu 3 soruyu kendinize sorun:\n1. Buna gerçekten ihtiyacım var mı?\n2. Evde bunun yerine kullanabileceğim bir şey var mı?\n3. 24 saat sonra hala bunu almak isteyecek miyim?\nYarın tekrar değerlendirmek üzere sepeti kapatın!`;
    } else if (msgLower.includes('yatırım') || msgLower.includes('nasıl biriktiririm') || msgLower.includes('tavsiye')) {
      aiResponse = `Yatırım yapmak için öncelikle acil durum fonu oluşturmalısınız (3-6 aylık gideriniz kadar). Ardından:\n1. Bireysel Emeklilik Sistemi (BES) ile devlet katkısından yararlanabilirsiniz.\n2. Yatırım fonları veya hisse senedi piyasalarını araştırabilirsiniz.\n3. Altın ve döviz gibi geleneksel araçları sepet yapıp riski dağıtabilirsiniz.\nNot: Bu tavsiyeler finansal okuryazarlık kapsamındadır, yatırım danışmanlığı değildir.`;
    } else if (msgLower.includes('hedef') || msgLower.includes('tasarruf')) {
      aiResponse = `Aktif tasarruf hedeflerinize odaklanmak, gereksiz harcamalardan kaçınmanızı kolaylaştırır. 'Tasarruf Hedefleri' ekranından kendinize bir hedef belirleyin ve her dürtüsel alışverişi engellediğinizde o tutarı hedefinize aktarın!`;
    } else {
      aiResponse = `Finansal disiplin konusunda her zaman yanınızdayım. Bana harcamalarınız, bütçe yapma teknikleri veya birikim tavsiyeleri hakkında dilediğinizi sorabilirsiniz. Örneğin: "Dürtüsel harcamaları nasıl engellerim?" veya "Mevcut durumum nedir?"`;
    }

    res.status(200).json({
      reply: aiResponse
    });
  });
};
