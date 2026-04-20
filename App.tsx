import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { supabase } from './src/lib/supabase';
import { useStore } from './src/store';
import AuthScreen from './src/screens/AuthScreen';
import LeaguesScreen from './src/screens/LeaguesScreen';
import DashboardDrawer from './src/navigation/DashboardDrawer';
import TeamProfileScreen from './src/screens/TeamProfileScreen';
import PlayerProfileScreen from './src/screens/PlayerProfileScreen';
import { LoadingOverlay } from './src/components/LoadingOverlay';

const Stack = createNativeStackNavigator();

export default function App() {
  const syncAllData = useStore(state => state.syncAllData);
  const isLoading = useStore(state => state.isLoading);

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        syncAllData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncAllData]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <NavigationContainer theme={DarkTheme}>
        <Stack.Navigator
          initialRouteName="Auth"
          screenOptions={{
            headerStyle: { backgroundColor: '#1e293b' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            headerShown: false, // Hide headers for main screens, we handle them or let Tabs handle them
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen 
            name="Leagues" 
            component={LeaguesScreen} 
          />
          <Stack.Screen 
            name="AppDrawer" 
            component={DashboardDrawer} 
          />
          <Stack.Screen 
            name="TeamProfile" 
            component={TeamProfileScreen} 
          />
          <Stack.Screen 
            name="PlayerProfile" 
            component={PlayerProfileScreen} 
          />
        </Stack.Navigator>
      </NavigationContainer>
      <LoadingOverlay visible={isLoading} />
    </SafeAreaProvider>
  );
}
