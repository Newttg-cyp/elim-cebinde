import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';

import { authAPI, setAuthToken } from './src/services/api';
import DashboardScreen from './src/screens/DashboardScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import SavingsGoalsScreen from './src/screens/SavingsGoalsScreen';
import AiAssistantScreen from './src/screens/AiAssistantScreen';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loading, setLoading] = useState(false);

  // Auth Inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre gereklidir.');
      return;
    }
    try {
      setLoading(true);
      const res = await authAPI.login(email, password);
      setAuthToken(res.token);
      setUser(res.user);
      setIsAuthenticated(true);
    } catch (err) {
      Alert.alert('Giriş Başarısız', err.message || 'E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    try {
      setLoading(true);
      const res = await authAPI.register(name, email, password);
      setAuthToken(res.token);
      setUser(res.user);
      setIsAuthenticated(true);
      Alert.alert('Hoş Geldiniz!', 'Hesabınız başarıyla oluşturuldu.');
    } catch (err) {
      Alert.alert('Kayıt Başarısız', err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('Dashboard');
  };

  // Basit bir navigasyon router simülasyonu
  const renderScreen = () => {
    // Ekrana geçiş yaparken sahte navigation nesnesi gönderiyoruz
    const mockNavigation = {
      navigate: (screenName) => {
        if (screenName === 'AI Assistant') setActiveTab('Asistan');
        else if (screenName === 'Add Transaction') setActiveTab('Ekle');
        else if (screenName === 'Dashboard') setActiveTab('Dashboard');
        else if (screenName === 'Budget') setActiveTab('Bütçe');
        else if (screenName === 'Savings') setActiveTab('Tasarruf');
      },
      addListener: (event, callback) => {
        // focus olayını simüle et
        if (event === 'focus') {
          callback();
        }
        return () => {};
      },
      goBack: () => {
        setActiveTab('Dashboard');
      }
    };

    switch (activeTab) {
      case 'Dashboard':
        return <DashboardScreen navigation={mockNavigation} />;
      case 'Ekle':
        return <AddTransactionScreen navigation={mockNavigation} />;
      case 'Bütçe':
        return <BudgetScreen />;
      case 'Tasarruf':
        return <SavingsGoalsScreen />;
      case 'Asistan':
        return <AiAssistantScreen />;
      default:
        return <DashboardScreen navigation={mockNavigation} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authCard}>
          <Text style={styles.logoEmoji}>🛡️</Text>
          <Text style={styles.authTitle}>Elim Cebimde</Text>
          <Text style={styles.authSubtitle}>Yapay Zeka Destekli Finansal Disiplin & Akıllı Bütçe</Text>

          {isRegisterMode && (
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor="#64748B"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} />
          ) : (
            <TouchableOpacity
              style={styles.authButton}
              onPress={isRegisterMode ? handleRegister : handleLogin}
            >
              <Text style={styles.authButtonText}>
                {isRegisterMode ? 'Kayıt Ol' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.toggleModeBtn}
            onPress={() => setIsRegisterMode(!isRegisterMode)}
          >
            <Text style={styles.toggleModeText}>
              {isRegisterMode ? 'Zaten hesabınız var mı? Giriş Yap' : 'Hesabınız yok mu? Yeni Hesap Oluştur'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* Profil Barı */}
      <View style={styles.topProfileBar}>
        <View>
          <Text style={styles.welcomeText}>Hoş geldin,</Text>
          <Text style={styles.profileName}>{user?.name || 'Kullanıcı'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Ekran İçeriği */}
      <View style={styles.mainContent}>
        {renderScreen()}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'Dashboard' && styles.navItemActive]}
          onPress={() => setActiveTab('Dashboard')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={[styles.navText, activeTab === 'Dashboard' && styles.navTextActive]}>Durum</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'Ekle' && styles.navItemActive]}
          onPress={() => setActiveTab('Ekle')}
        >
          <Text style={styles.navIcon}>⚡</Text>
          <Text style={[styles.navText, activeTab === 'Ekle' && styles.navTextActive]}>İşlem Ekle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'Bütçe' && styles.navItemActive]}
          onPress={() => setActiveTab('Bütçe')}
        >
          <Text style={styles.navIcon}>🗓️</Text>
          <Text style={[styles.navText, activeTab === 'Bütçe' && styles.navTextActive]}>Bütçe</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'Tasarruf' && styles.navItemActive]}
          onPress={() => setActiveTab('Tasarruf')}
        >
          <Text style={styles.navIcon}>🎯</Text>
          <Text style={[styles.navText, activeTab === 'Tasarruf' && styles.navTextActive]}>Hedefler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'Asistan' && styles.navItemActive]}
          onPress={() => setActiveTab('Asistan')}
        >
          <Text style={styles.navIcon}>🤖</Text>
          <Text style={[styles.navText, activeTab === 'Asistan' && styles.navTextActive]}>Asistan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    padding: 24,
  },
  authCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  logoEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  input: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    fontSize: 15,
  },
  authButton: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleModeBtn: {
    marginTop: 20,
  },
  toggleModeText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topProfileBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  welcomeText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  profileName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  logoutBtnText: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
    marginTop: -10, // Sekme çizgisiyle hizalamak için hafifçe yukarı kaydır
    paddingTop: 14,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  navTextActive: {
    color: '#3B82F6',
    fontWeight: 'bold',
  }
});
