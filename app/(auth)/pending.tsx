import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../context/AuthContext'

export default function Pending() {
  const { signOut, profile } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/OLM-Football.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Request Submitted</Text>
      <Text style={styles.message}>
        Hi {profile?.full_name ?? 'there'}, your access request has been sent to the lead coach for approval.
      </Text>
      <Text style={styles.sub}>You'll be able to log in once your account has been approved.</Text>
      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { width: 80, height: 80, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16, textAlign: 'center' },
  message: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 12, lineHeight: 24 },
  sub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 40 },
  button: { backgroundColor: '#FF9500', borderRadius: 8, padding: 14, paddingHorizontal: 32 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
