import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView
} from 'react-native';
import { budgetAPI, aiAPI } from '../services/api';

const DEFAULT_CATEGORIES = ['Market', 'Giyim', 'Ulaşım', 'Dışarıda Yemek', 'Eğlence', 'Kira/Faturalar', 'Diğer'];

export default function BudgetScreen() {
  const [budgets, setBudgets] = useState({});
  const [spentData, setSpentData] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitInput, setLimitInput] = useState('');

  const loadBudgetsAndStatus = async () => {
    try {
      setLoading(true);
      // Bütçe limitlerini çek
      const budgetsRes = await budgetAPI.getBudgets();
      const budgetMap = {};
      budgetsRes.budgets.forEach(b => {
        budgetMap[b.category] = b.monthly_limit;
      });
      setBudgets(budgetMap);

      // Harcama analizlerini çek
      const analysisRes = await aiAPI.getAnalysis();
      // API'dan gelen kategori harcamalarını eşle
      // Backend'deki getFinancialAnalysis metodu stats ve recommendations dönüyor.
      // Toplam harcamayı alıp backend'de hesaplandığı gibi kategorilere göre dağılımı alacağız.
      // Dashboard'da kategori harcamaları backend'de toplanıyordu.
      // Eğer veritabanındaki işlemler boşsa 0 olacaktır.
      // Hataları önlemek için analiz servisi üzerinden mock/gerçek veriyi alalım.
      const rawExpenses = analysisRes.categoryExpenses || {};
      setSpentData(rawExpenses);

    } catch (err) {
      console.log('Bütçe limitleri yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgetsAndStatus();
  }, []);

  const handleSaveBudget = async () => {
    if (!limitInput || isNaN(limitInput) || parseFloat(limitInput) < 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir limit değeri girin.');
      return;
    }

    try {
      setLoading(true);
      await budgetAPI.setBudget(selectedCategory, parseFloat(limitInput));
      Alert.alert('Başarılı', `"${selectedCategory}" için bütçe limiti belirlendi.`);
      setModalVisible(false);
      setLimitInput('');
      loadBudgetsAndStatus();
    } catch (err) {
      Alert.alert('Hata', 'Bütçe limiti kaydedilemedi.');
      setLoading(false);
    }
  };

  if (loading && Object.keys(budgets).length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EAB308" />
        <Text style={styles.loadingText}>Bütçe Planları Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Aylık Bütçe Planı</Text>
        <Text style={styles.subtitle}>
          Her kategori için harcama limiti belirleyin. Limit aşımında "Elim Cebimde" sizi uyaracaktır.
        </Text>

        {DEFAULT_CATEGORIES.map((category) => {
          const limit = budgets[category] || 0;
          const spent = spentData[category] || 0;
          const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
          const isOver = limit > 0 && spent > limit;

          return (
            <View key={category} style={styles.budgetCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.categoryName}>🏷️ {category}</Text>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => {
                    setSelectedCategory(category);
                    setLimitInput(limit ? limit.toString() : '');
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.editBtnText}>{limit > 0 ? 'Düzenle' : 'Limit Tanımla'}</Text>
                </TouchableOpacity>
              </View>

              {limit > 0 ? (
                <View style={styles.budgetStatus}>
                  <View style={styles.amountRow}>
                    <Text style={styles.spentText}>Harcanan: {spent.toLocaleString('tr-TR')} ₺</Text>
                    <Text style={styles.limitText}>Limit: {limit.toLocaleString('tr-TR')} ₺</Text>
                  </View>

                  {/* İlerleme Çubuğu */}
                  <View style={styles.progressWrapper}>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percent}%`,
                            backgroundColor: isOver ? '#EF4444' : percent > 80 ? '#F59E0B' : '#EAB308'
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.percentText, isOver && styles.overText]}>%{percent}</Text>
                  </View>
                  
                  {isOver && (
                    <Text style={styles.overWarningText}>
                      ⚠️ Bu kategori için bütçe limitinizi aştınız! Harcamalarınızı durdurun.
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noLimitText}>Henüz bu kategori için bir aylık bütçe limiti belirlenmedi.</Text>
              )}
            </View>
          );
        })}

      </ScrollView>

      {/* Bütçe Düzenleme Modalı */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedCategory} Limiti Belirle</Text>
            <Text style={styles.modalSub}>
              Bu kategorideki harcamalarınız bu limite ulaştığında anlık bildirim alırsınız.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Limit Tutarı (TL)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={limitInput}
              onChangeText={setLimitInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBudget}>
                <Text style={styles.submitBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    padding: 24,
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 25,
    lineHeight: 20,
  },
  budgetCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  editBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  noLimitText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 12,
    fontStyle: 'italic',
  },
  budgetStatus: {
    marginTop: 15,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spentText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  limitText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  overText: {
    color: '#EF4444',
  },
  overWarningText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 10,
    fontWeight: '600',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  }
});
