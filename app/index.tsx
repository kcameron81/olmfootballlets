import { Redirect } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { ActivityIndicator, View } from 'react-native'

export default function Index() {
  const { session, isApproved, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!session) return <Redirect href="/(auth)/login" />
  if (!isApproved) return <Redirect href="/(auth)/pending" />
  return <Redirect href="/(app)/year-groups" />
}
