import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Toast from 'react-native-toast-message';

const FIELDS = [
  { key: 'fullName',    label: 'Full name',        type: 'default',      placeholder: 'Priya Sharma',         required: true  },
  { key: 'email',       label: 'Email',             type: 'email-address',placeholder: 'you@email.com',         required: true  },
  { key: 'phone',       label: 'Phone (optional)',  type: 'phone-pad',    placeholder: '+91 98765 43210',       required: false },
  { key: 'password',    label: 'Password',          type: 'default',      placeholder: 'Min 6 characters',      required: true, secure: true },
  { key: 'dateOfBirth', label: 'Date of birth',     type: 'default',      placeholder: 'DD/MM/YYYY e.g. 14/03/1992', required: true },
  { key: 'timeOfBirth', label: 'Time of birth',     type: 'default',      placeholder: 'HH:MM e.g. 06:30',     required: true  },
  { key: 'placeOfBirth',label: 'Place of birth',    type: 'default',      placeholder: 'City, State, Country', required: true  },
] as const;

const GENDERS = ['Male', 'Female', 'Other'] as const;

export default function RegisterScreen({ navigation }: any) {
  const { login } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({
    fullName: '', email: '', phone: '', password: '',
    dateOfBirth: '', timeOfBirth: '', placeOfBirth: '', gender: 'Male',
  });
  const [loading, setLoading] = useState(false);

  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (form.password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', { ...form, role: 'user' });
      await login(data.token, data.user);
      Toast.show({ type: 'success', text1: 'Account created! Welcome ✦' });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || 'Registration failed',
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
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoCircle}>
            <Text style={s.logoIcon}>✦</Text>
          </View>
          <Text style={s.title}>Create your profile</Text>
          <Text style={s.subtitle}>Your birth details personalise your predictions</Text>
        </View>

        <View style={s.card}>
          {FIELDS.map(f => (
            <View key={f.key} style={s.field}>
              <Text style={s.label}>{f.label}</Text>
              <TextInput
                style={s.input}
                placeholder={f.placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={f.type as any}
                autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                autoCorrect={false}
                secureTextEntry={(f as any).secure || false}
                value={form[f.key]}
                onChangeText={v => upd(f.key, v)}
              />
            </View>
          ))}

          {/* Gender selector */}
          <View style={s.field}>
            <Text style={s.label}>Gender</Text>
            <View style={s.genderRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.genderBtn, form.gender === g && s.genderBtnActive]}
                  onPress={() => upd('gender', g)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.genderTxt, form.gender === g && s.genderTxtActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Create account →</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={s.link}>Already registered? <Text style={s.linkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex:            { flex: 1, backgroundColor: '#F5F3FF' },
  container:       { flexGrow: 1, padding: 24, paddingTop: 48 },
  header:          { alignItems: 'center', marginBottom: 24 },
  logoCircle:      { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEF2FF',
                     alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoIcon:        { fontSize: 24, color: '#4F46E5' },
  title:           { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  subtitle:        { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  card:            { backgroundColor: '#fff', borderRadius: 16, padding: 20,
                     borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  field:           { marginBottom: 14 },
  label:           { fontSize: 13, color: '#6B7280', marginBottom: 6, fontWeight: '500' },
  input:           { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
                     paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
                     color: '#111827', backgroundColor: '#FAFAFA' },
  genderRow:       { flexDirection: 'row', gap: 8 },
  genderBtn:       { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
                     borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#FAFAFA' },
  genderBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  genderTxt:       { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  genderTxtActive: { color: '#fff' },
  btn:             { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 13,
                     alignItems: 'center', marginTop: 6 },
  btnDisabled:     { opacity: 0.6 },
  btnText:         { color: '#fff', fontWeight: '600', fontSize: 15 },
  link:            { textAlign: 'center', fontSize: 14, color: '#6B7280' },
  linkBold:        { color: '#4F46E5', fontWeight: '600' },
});
