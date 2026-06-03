import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { aiAPI } from '../services/api';

export default function AiAssistantScreen() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Merhaba! Ben "Elim Cebimde" AI Finansal Asistanınızım. Harcamalarınızı disipline sokmak, dürtüsel harcamalarınızı azaltmak veya birikim stratejileri oluşturmak için bana dilediğinizi sorabilirsiniz. 🚀',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef();

  const QUICK_PROMPTS = [
    'Mevcut durumumu özetle 📊',
    'Dürtüsel harcamaları nasıl önlerim? 💸',
    'Tasarruf yapma taktikleri nelerdir? 🎯',
    'Yatırım önerisi alabilir miyim? 📈'
  ];

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    // Kullanıcı mesajını ekle
    const userMsg = {
      id: Math.random().toString(),
      text: text,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setSending(true);

    try {
      // API isteği at
      const response = await aiAPI.sendMessage(text);
      
      const aiMsg = {
        id: Math.random().toString(),
        text: response.reply,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = {
        id: Math.random().toString(),
        text: 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    // Mesajlar eklendikçe en alta kaydır
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const renderMessage = ({ item }) => (
    <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.aiRow]}>
      {!item.isUser && <Text style={styles.botAvatar}>🤖</Text>}
      <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>
          {item.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🤖 AI Finansal Koç</Text>
          <Text style={styles.headerSubtitle}>7/24 Aktif • Akıllı Tavsiyeler</Text>
        </View>

        {/* Mesaj Listesi */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            sending && (
              <View style={styles.loadingBubbleRow}>
                <Text style={styles.botAvatar}>🤖</Text>
                <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
              </View>
            )
          }
        />

        {/* Hızlı Sorular */}
        {messages.length === 1 && (
          <View style={styles.quickPromptsContainer}>
            <Text style={styles.quickPromptsTitle}>Önerilen Sorular:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPromptsScroll}>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.promptChip}
                  onPress={() => handleSendMessage(prompt)}
                >
                  <Text style={styles.promptChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Mesaj Giriş Alanı */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Finansal asistanına sor..."
            placeholderTextColor="#64748B"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendMessage()}>
            <Text style={styles.sendBtnText}>Gönder</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#1E293B',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#10B981', // Canlı yeşil durum
    fontSize: 12,
    marginTop: 2,
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    fontSize: 22,
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#3B82F6', // Yapay zeka mavisi kullanıcı baloncuğu
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderBottomLeftRadius: 2,
  },
  loadingBubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingBubble: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    color: '#94A3B8',
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  quickPromptsContainer: {
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  quickPromptsTitle: {
    color: '#94A3B8',
    fontSize: 12,
    paddingLeft: 16,
    marginBottom: 6,
  },
  quickPromptsScroll: {
    paddingLeft: 16,
  },
  promptChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  promptChipText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 12,
  },
  sendBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
