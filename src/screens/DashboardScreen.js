import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  SafeAreaView
} from 'react-native';
import { aiAPI, transactionAPI } from '../services/api';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    impulsiveExpense: 0,
    impulsivityScore: 0,
    balance: 0
  });
  const [recommendations, setRecommendations] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      // AI Analizini ve son harcamaları getir
      const analysisData = await aiAPI.getAnalysis();
      const transactionData = await transactionAPI.getTransactions();

      if (analysisData && analysisData.stats) {
        setStats(analysisData.stats);
        setRecommendations(analysisData.recommendations || []);
        setBudgetAlerts(analysisData.budgetAlerts || []);
      }
      if (transactionData && transactionData.transactions) {
        setRecentTransactions(transactionData.transactions.slice(0, 5)); // Son 5 işlem
      }
    } catch (err) {
      console.log('Veriler çekilirken hata oluştu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
        <Text style={styles.loadingText}>Finansal Raporunuz Analiz Ediliyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Elim Cebimde</Text>
            <Text style={styles.headerSubtitle}>Yapay Zeka Destekli Finansal Disiplin</Text>
          </View>
          <TouchableOpacity style={styles.aiButton} onPress={() => navigation.navigate('AI Assistant')}>
            <Text style={styles.aiButtonEmoji}>🤖</Text>
          </TouchableOpacity>
        </View>

        {/* Ana Bakiye Kartı - Premium Gradient Görünüm */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Kullanılabilir Net Bakiye</Text>
          <Text style={styles.balanceAmount}>{stats.balance.toLocaleString('tr-TR')} ₺</Text>
          
          <View style={styles.statsDivider} />
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>📈 Aylık Gelir</Text>
              <Text style={styles.statValueGreen}>+{stats.totalIncome.toLocaleString('tr-TR')} ₺</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>📉 Aylık Gider</Text>
              <Text style={styles.statValueRed}>-{stats.totalExpense.toLocaleString('tr-TR')} ₺</Text>
            </View>
          </View>
        </View>

        {/* Dürtüsellik Göstergesi */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧠 Dürtüsel Alışveriş Analizi</Text>
          <View style={styles.impulseRow}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreText}>%{stats.impulsivityScore}</Text>
              <Text style={styles.scoreSub}>Dürtü Skoru</Text>
            </View>
            <View style={styles.impulseDetails}>
              <Text style={styles.impulseText}>
                {stats.impulsivityScore > 50 
                  ? "Dürtüsel harcama alışkanlığınız yüksek! AI Asistanı harcama yapmadan önce uyaracaktır."
                  : stats.impulsivityScore > 20
                  ? "Kontrollü gidiyorsunuz ancak dürtüsel harcamalara dikkat etmelisiniz."
                  : "Mükemmel! Finansal disiplininiz oldukça güçlü."}
              </Text>
              <Text style={styles.impulseValue}>
                Plansız Harcama: <Text style={styles.impulseSum}>{stats.impulsiveExpense.toLocaleString('tr-TR')} ₺</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Bütçe Limit Aşımları (Uyarılar) */}
        {budgetAlerts.length > 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.alertCardTitle}>⚠️ Limit Aşım Uyarıları</Text>
            {budgetAlerts.map((alert, idx) => (
              <View key={idx} style={styles.alertItem}>
                <Text style={styles.alertText}>
                  📌 <Text style={{fontWeight: 'bold'}}>{alert.category}</Text> limitini <Text style={styles.alertOverText}>{alert.over.toLocaleString('tr-TR')} ₺</Text> aştınız! (Limit: {alert.limit} ₺)
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* AI Tavsiyeleri */}
        <View style={styles.aiRecommendationsCard}>
          <Text style={styles.aiRecTitle}>🤖 Yapay Zeka Finansal Tavsiyesi</Text>
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <View key={index} style={styles.recItem}>
                <Text style={styles.recEmoji}>💡</Text>
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.recText}>Veri toplandıkça yapay zeka size özel birikim ve harcama tavsiyeleri sunacaktır.</Text>
          )}
        </View>

        {/* Son Harcamalar */}
        <View style={styles.card}>
          <View style={styles.recentHeader}>
            <Text style={styles.cardTitle}>📋 Son İşlemler</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Add Transaction')}>
              <Text style={styles.addLink}>+ Ekle</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.length > 0 ? (
            recentTransactions.map((item) => (
              <View key={item.id.toString()} style={styles.transactionItem}>
                <View style={styles.transLeft}>
                  <Text style={styles.transCategoryEmoji}>
                    {item.type === 'income' ? '💵' : item.is_impulsive ? '⚡' : '🏷️'}
                  </Text>
                  <View>
                    <Text style={styles.transCategory}>{item.category}</Text>
                    <Text style={styles.transDesc} numberOfLines={1}>{item.description || 'Açıklama girilmedi'}</Text>
                  </View>
                </View>
                <View style={styles.transRight}>
                  <Text style={item.type === 'income' ? styles.incomeText : styles.expenseText}>
                    {item.type === 'income' ? '+' : '-'}{item.amount} ₺
                  </Text>
                  {item.is_impulsive === 1 && (
                    <View style={styles.impulseBadge}>
                      <Text style={styles.impulseBadgeText}>Dürtüsel</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Henüz hiç işlem girmediniz.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Premium Slate Dark Mode
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  aiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  aiButtonEmoji: {
    fontSize: 22,
  },
  balanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    color: '#F8FAFC',
    fontSize: 34,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  statsDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  statValueGreen: {
    color: '#10B981', // Canlı Zümrüt Yeşili
    fontSize: 18,
    fontWeight: 'bold',
  },
  statValueRed: {
    color: '#EF4444', // Canlı Kırmızı
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 15,
  },
  impulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#EAB308', // Altın Sarısı
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  scoreText: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreSub: {
    color: '#94A3B8',
    fontSize: 9,
    textAlign: 'center',
  },
  impulseDetails: {
    flex: 1,
  },
  impulseText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  impulseValue: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  impulseSum: {
    color: '#F43F5E',
    fontWeight: 'bold',
  },
  alertCard: {
    backgroundColor: '#7F1D1D',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  alertCardTitle: {
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  alertItem: {
    marginBottom: 6,
  },
  alertText: {
    color: '#FEE2E2',
    fontSize: 13,
    lineHeight: 18,
  },
  alertOverText: {
    color: '#FCA5A5',
    fontWeight: 'bold',
  },
  aiRecommendationsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#3B82F6', // Yapay zeka mavi çerçeve
  },
  aiRecTitle: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recEmoji: {
    marginRight: 10,
    fontSize: 16,
  },
  recText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addLink: {
    color: '#3B82F6',
    fontWeight: 'bold',
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  transLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transCategoryEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  transCategory: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  transDesc: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    maxWidth: 200,
  },
  transRight: {
    alignItems: 'flex-end',
  },
  incomeText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 15,
  },
  expenseText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 15,
  },
  impulseBadge: {
    backgroundColor: '#F43F5E',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  impulseBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 15,
  }
});
