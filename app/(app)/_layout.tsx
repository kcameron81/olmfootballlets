import { Tabs } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { Redirect } from 'expo-router'
import { ActivityIndicator, View, Image } from 'react-native'

function HeaderLogo() {
  return (
    <Image
      source={require('../../assets/OLM-Football.png')}
      style={{ width: 36, height: 36, marginLeft: 12 }}
      resizeMode="contain"
    />
  )
}

export default function AppLayout() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!session) return <Redirect href="/(auth)/login" />
  if (!profile?.approved) return <Redirect href="/(auth)/pending" />

  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e0e0e0', borderTopWidth: 1 },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#999',
      headerStyle: { backgroundColor: '#fff', borderBottomColor: '#e0e0e0', borderBottomWidth: 1 },
      headerTintColor: '#1a1a2e',
      headerLeft: () => <HeaderLogo />,
    }}>
      <Tabs.Screen name="calendar" options={{ title: 'Schedule' }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen name="year-groups" options={{ href: null }} />
      <Tabs.Screen name="fees/[id]" options={{ href: null }} />
    </Tabs>
  )
}
