export const API_URL = 'http://10.246.191.136:8000';

// App.js dosyasındaki hataları önlemek için şimdilik boş fonksiyonlar ekleyelim:
export const authAPI = {
  login: async (email, password) => { return { token: 'test', user: { name: 'Dino' } }; },
  register: async (name, email, password) => { return { token: 'test', user: { name: name } }; }
};

export const setAuthToken = (token) => { console.log('Token ayarlandı:', token); };
