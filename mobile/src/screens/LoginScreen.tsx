import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Toast from 'react-native-toast-message';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Please enter email and password' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      await login(data.token, data.user);
      Toast.show({ type: 'success', text1: `Welcome back, ${data.user.fullName}!` });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || 'Login failed. Check your credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Text style={s.logoIcon}>✦</Text>
          </View>
          <Text style={s.title}>AstroChat</Text>
          <Text style={s.subtitle}>Sign in to your account</Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Sign in →</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={s.link}>No account? <Text style={s.linkBold}>Register here</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: '#F5F3FF' },
  container:   { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap:    { alignItems: 'center', marginBottom: 32 },
  logoCircle:  { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF',
                 alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoIcon:    { fontSize: 28, color: '#4F46E5' },
  title:       { fontSize: 26, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  subtitle:    { fontSize: 14, color: '#6B7280', marginTop: 4 },
  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 20,
                 borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  field:       { marginBottom: 16 },
  label:       { fontSize: 13, color: '#6B7280', marginBottom: 6, fontWeight: '500' },
  input:       { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
                 paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
                 color: '#111827', backgroundColor: '#FAFAFA' },
  btn:         { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 13,
                 alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontWeight: '600', fontSize: 15 },
  link:        { textAlign: 'center', fontSize: 14, color: '#6B7280' },
  linkBold:    { color: '#4F46E5', fontWeight: '600' },
});
