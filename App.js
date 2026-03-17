import React, { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { Platform } from 'react-native';

export default function App() {
  // Global Polyfill & Warning Suppression for third-party Web libraries
  useEffect(() => {
    if (Platform.OS === 'web') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (typeof args[0] === 'string') {
          if (args[0].includes('Blocked aria-hidden on an element')) return;
          if (args[0].includes('props.pointerEvents is deprecated')) return;
          if (args[0].includes('"shadow*" style props are deprecated')) return;
          if (args[0].includes('useNativeDriver` is not supported')) return;
        }
        originalConsoleError(...args);
      };

      const originalConsoleWarn = console.warn;
      console.warn = (...args) => {
        if (typeof args[0] === 'string') {
          if (args[0].includes('Blocked aria-hidden on an element')) return;
          if (args[0].includes('props.pointerEvents is deprecated')) return;
          if (args[0].includes('"shadow*" style props are deprecated')) return;
          if (args[0].includes('useNativeDriver` is not supported')) return;
        }
        originalConsoleWarn(...args);
      };
    }
  }, []);

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <ThemeProvider>
            <AppNavigator />
          </ThemeProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
