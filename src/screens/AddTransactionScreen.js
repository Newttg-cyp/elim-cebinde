import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { transactionAPI } from '../services/api';

const CATEGORIES = {
  expense: ['Market', 'Giyim', 'Ulaşım', 'Dışarıda Yemek', 'Eğlence', 'Kira/Faturalar', 'Diğer'],
  income: ['Maaş', 'Freelance', 'Yatırım Geliri', 'Hediye', 'Diğer']
};

export default function AddTransactionScreen({ navigation }) {
  const [type, setType] = useState('expense'); // 'income' or 'expense'
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [description, setDescription] = useState('');
  const [isImpulsive, setIsImpulsive] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(CATEGORIES[newType][0]);
    if (newType === 'income') {
      setIsImpulsive(false); // Gelir dürtüsel olamaz
    }
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin.');
      return;
    }
    if (!category) {
      Alert.alert('Hata', 'Lütfen bir kategori seçin.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        type,
        amount: parseFloat(amount),
        category,
        description,
        is_impulsive: type === 'expense' ? isImpulsive : false
      };

      const response = await transactionAPI.addTransaction(payload);
      
      // Eğer limit aşımı veya dürtüsel uyarısı geldiyse kullanıcıyı uyar
      if (response.alert) {
        Alert.alert(
          response.alert.title,
          response.alert.message,
          [
            { text: 'Anladım', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        Alert.alert('Başarılı', 'İşlem başarıyla eklendi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'İşlem eklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Yeni İşlem Ekle</Text>
        <Text style={styles.subtitle}>Bütçenizi kontrol etmek için gelir ve giderlerinizi anlık girin.</Text>

        {/* Gelir / Gider Seçici Tab */}
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'expense' && styles.typeButtonExpenseActive]}
            onPress={() => handleTypeChange('expense')}
          >
            <Text style={[styles.typeButtonText, type === 'expense' && styles.activeText]}>📉 Gider</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === 'income' && styles.typeButtonIncomeActive]}
            onPress={() => handleTypeChange('income')}
          >
            <Text style={[styles.typeButtonText, type === 'income' && styles.activeText]}>📈 Gelir</Text>
          </TouchableOpacity>
        </View>

        {/* Tutar Girişi */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tutar (TL)</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Kategori Seçici */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES[type].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipActive
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[
                  styles.categoryChipText,
                  category === cat && styles.categoryChipTextActive
                ]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Açıklama */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Nereye veya nereden? (Örn: Starbucks, Maaş ödemesi)"
            placeholderTextColor="#64748B"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Dürtüsel Alışveriş Switch (Sadece Gider İçin) */}
        {type === 'expense' && (
          <View style={styles.impulseContainer}>
            <View style={styles.impulseTextContainer}>
              <Text style={styles.impulseTitle}>⚡ Dürtüsel Alışveriş mi?</Text>
              <Text style={styles.impulseDesc}>
                Planlanmamış, anlık bir hevesle veya ani bir kararla yapılan alışverişler.
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#334155', true: '#F43F5E' }}
              thumbColor={isImpulsive ? '#FFF' : '#94A3B8'}
              ios_backgroundColor="#334155"
              onValueChange={setIsImpulsive}
              value={isImpulsive}
            />
          </View>
        )}

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Kaydet</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
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
  typeContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonExpenseActive: {
    backgroundColor: '#EF4444',
  },
  typeButtonIncomeActive: {
    backgroundColor: '#10B981',
  },
  typeButtonText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    fontSize: 15,
  },
  activeText: {
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  amountInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  impulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F43F5E', // Dikkat çeken dürtüsellik rengi
    marginBottom: 30,
  },
  impulseTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  impulseTitle: {
    color: '#F43F5E',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  impulseDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#475569',
  }
});
