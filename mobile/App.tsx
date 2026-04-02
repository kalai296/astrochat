import React from 'react';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen      from './src/screens/LoginScreen';
import RegisterScreen   from './src/screens/RegisterScreen';
import DashboardScreen  from './src/screens/DashboardScreen';
import AstrologerScreen from './src/screens/AstrologerScreen';
import ChatScreen       from './src/screens/ChatScreen';

// Suppress known non-critical warnings
LogBox.ignoreLogs([
  'Warning: ReactDOM.render',
  'ViewPropTypes will be removed',
  'AsyncStorage has been extracted',
  'EventEmitter.removeListener',
]);

export type RootStackParamList = {
  Login:      undefined;
  Register:   undefined;
  Dashboard:  undefined;
  Astrologer: undefined;
  Chat: {
    sessionId:   string;
    sessionType: 'chat' | 'voice' | 'video';
    userName:    string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:         { backgroundColor: '#ffffff' },
        headerTintColor:     '#111827',
        headerTitleStyle:    { fontWeight: '600', fontSize: 16 },
        headerShadowVisible: false,
        contentStyle:        { backgroundColor: '#F9FAFB' },
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login"    component={LoginScreen}    options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      ) : user.role === 'astrologer' ? (
        <>
          <Stack.Screen name="Astrologer" component={AstrologerScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
              title: (route.params as any)?.userName || 'Chat',
              headerBackTitle: 'Back',
            })}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
              title: (route.params as any)?.userName || 'Chat',
              headerBackTitle: 'Back',
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <Toast />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },
});
