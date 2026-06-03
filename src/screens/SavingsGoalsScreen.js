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
import { savingsAPI } from '../services/api';

export default function SavingsGoalsScreen() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  // Hızlı Ekleme Modalı / Dialog States
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [addSum, setAddSum] = useState('');

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await savingsAPI.getGoals();
      setGoals(data.savingsGoals || []);
    } catch (err) {
      console.log('Tasarruflar yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleAddGoal = async () => {
    if (!title || !targetAmount || isNaN(targetAmount) || parseFloat(targetAmount) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir başlık ve hedef miktar girin.');
      return;
    }

    try {
      const target = parseFloat(targetAmount);
      const current = currentAmount ? parseFloat(currentAmount) : 0;
      
      await savingsAPI.addGoal(title, target, current, deadline);
      Alert.alert('Başarılı', 'Tasarruf hedefi oluşturuldu.');
      setModalVisible(false);
      
      // Formu sıfırla
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
      
      loadGoals();
    } catch (err) {
      Alert.alert('Hata', err.message || 'Hedef oluşturulurken hata oluştu.');
    }
  };

  const handleUpdateProgress = async () => {
    if (!addSum || isNaN(addSum) || parseFloat(addSum) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir miktar girin.');
      return;
    }

    try {
      const response = await savingsAPI.updateProgress(selectedGoal.id, parseFloat(addSum));
      
      if (response.alert) {
        Alert.alert(response.alert.title, response.alert.message);
      } else {
        Alert.alert('Başarılı', 'Birikiminiz güncellendi.');
      }
      
      setProgressModalVisible(false);
      setAddSum('');
      loadGoals();
    } catch (err) {
      Alert.alert('Hata', err.message || 'Güncelleme yapılırken hata oluştu.');
    }
  };

  const handleDeleteGoal = (id) => {
    Alert.alert(
      'Hedefi Sil',
      'Bu tasarruf hedefini silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await savingsAPI.deleteGoal(id);
              loadGoals();
            } catch (err) {
              Alert.alert('Hata', 'Hedef silinemedi.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Birikim Hedefleriniz Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Tasarruf Hedefleri</Text>
            <Text style={styles.subtitle}>Gereksiz harcamaları erteleyip geleceğinize yatırım yapın.</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Hedef</Text>
          </TouchableOpacity>
        </View>

        {goals.length > 0 ? (
          goals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            return (
              <View key={goal.id.toString()} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>🎯 {goal.title}</Text>
                  <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)}>
                    <Text style={styles.deleteText}>Sil</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountCollected}>{goal.current_amount.toLocaleString('tr-TR')} ₺</Text>
                  <Text style={styles.amountTarget}> / {goal.target_amount.toLocaleString('tr-TR')} ₺</Text>
                </View>

                {/* İlerleme Çubuğu */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                  </View>
                  <Text style={styles.progressPercent}>%{percent}</Text>
                </View>

                <View style={styles.goalFooter}>
                  <Text style={styles.deadlineText}>
                    📅 Son Tarih: {goal.deadline ? goal.deadline : 'Belirtilmedi'}
                  </Text>
                  <TouchableOpacity
                    style={styles.addMoneyBtn}
                    onPress={() => {
                      setSelectedGoal(goal);
                      setProgressModalVisible(true);
                    }}
                  >
                    <Text style={styles.addMoneyBtnText}>Para Ekle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Henüz Bir Hedef Yok 🤷</Text>
            <Text style={styles.emptySubtitle}>
              Kendi eviniz, arabanız, tatiliniz veya bir acil durum fonu için bütçe hedefleri oluşturarak başlayın.
            </Text>
            <TouchableOpacity style={styles.createFirstBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.createFirstBtnText}>İlk Hedefini Yarat</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* 1. Yeni Tasarruf Hedefi Modalı */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tasarruf Hedefi Ekle</Text>

            <TextInput
              style={styles.input}
              placeholder="Hedef Adı (Örn: Tatil Fonu, Yeni Bilgisayar)"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={styles.input}
              placeholder="Hedef Tutar (TL)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={setTargetAmount}
            />

            <TextInput
              style={styles.input}
              placeholder="Mevcut Birikim (TL - İsteğe Bağlı)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={currentAmount}
              onChangeText={setCurrentAmount}
            />

            <TextInput
              style={styles.input}
              placeholder="Hedef Tarihi (Örn: YYYY-MM-DD)"
              placeholderTextColor="#64748B"
              value={deadline}
              onChangeText={setDeadline}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddGoal}>
                <Text style={styles.submitBtnText}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Para Ekleme Modalı */}
      <Modal visible={progressModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Birikim Ekle</Text>
            {selectedGoal && (
              <Text style={styles.modalSubtitleLabel}>
                "{selectedGoal.title}" hedefi için birikime eklenecek miktarı yazın.
              </Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Eklenecek Miktar (TL)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={addSum}
              onChangeText={setAddSum}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setProgressModalVisible(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10B981' }]} onPress={handleUpdateProgress}>
                <Text style={styles.submitBtnText}>Ekle</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    maxWidth: 240,
  },
  addBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  goalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 13,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  amountCollected: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: 'bold',
  },
  amountTarget: {
    color: '#94A3B8',
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progressPercent: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  deadlineText: {
    color: '#64748B',
    fontSize: 12,
  },
  addMoneyBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addMoneyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtitle: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  createFirstBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createFirstBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
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
    marginBottom: 15,
  },
  modalSubtitleLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 15,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
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
