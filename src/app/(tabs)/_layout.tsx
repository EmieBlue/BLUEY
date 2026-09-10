import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { Platform, useWindowDimensions, View } from 'react-native';

import { TopNav } from '@/components/top-nav';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const pathname = usePathname();

  // The signed-out cinematic landing is a full-bleed experience with its own
  // navigation — hide the site chrome (top nav / bottom tabs) just for it, on web.
  const onLanding = pathname === '/' || pathname === '/index';
  const hideChrome = Platform.OS === 'web' && !user && onLanding;

  // On the website at desktop widths, put navigation at the TOP (like a website)
  // and hide the bottom tab bar. Phones keep the bottom tab bar.
  const wide = Platform.OS === 'web' && width >= 820;

  return (
    <View style={{ flex: 1 }}>
      {wide && !hideChrome ? <TopNav /> : null}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle:
            wide || hideChrome
              ? { display: 'none' }
              : {
                  backgroundColor: theme.background,
                  borderTopColor: theme.backgroundSelected,
                },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmarks" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
