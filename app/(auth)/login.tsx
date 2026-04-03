import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import * as WebBrowser from 'expo-web-browser'

WebBrowser.maybeCompleteAuthSession()

export default function Login() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Listen for auth state changes (OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      if (session && event === 'SIGNED_IN') {
        // Force profile creation if needed
        createProfileIfNeeded(session.user.id)
      }
    })
    return () => subscription?.unsubscribe()
  }, [])

  async function createProfileIfNeeded(userId: string) {
    try {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (!profile) {
        console.log('Profile not found, creating...')
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: 'user@example.com', // Will be updated from auth
            role: 'viewer',
            approved: false,
          })
        
        if (error) console.log('Profile creation failed:', error)
        else console.log('Profile created successfully')
      }
    } catch (err) {
      console.log('Profile check error:', err)
    }
  }

  async function handleGoogleSignIn() {
    console.log('Button pressed - starting Google sign-in')
    setLoading(true)
    try {
      console.log('About to call signInWithOAuth')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'olm-football-lets-app://auth/callback',
        },
      })

      if (error) {
        console.log('Google sign-in error:', error)
        Alert.alert('Sign In Failed', error.message)
      } else {
        console.log('Google sign-in initiated:', data)
      }
    } catch (err) {
      console.log('Google sign-in exception:', err)
      Alert.alert('Sign In Failed', 'Unexpected error occurred')
    } finally {
      console.log('Google sign-in flow completed, setting loading to false')
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Image source={require('../../assets/OLM-Football.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>OLM Football</Text>
        <Text style={styles.subtitle}>Pitch Fee Tracker</Text>

        <Pressable
          style={({ pressed }) => [styles.googleButton, loading && styles.googleButtonDisabled, pressed && styles.googleButtonPressed]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>
            {loading ? 'Signing In...' : 'Sign In with Google'}
          </Text>
        </Pressable>

        <Text style={styles.note}>
          New users will be registered automatically and require admin approval.
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
  logo: { width: 100, height: 100, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a1a2e', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  googleButton: { backgroundColor: '#4285F4', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8, width: '100%' },
  googleButtonPressed: { backgroundColor: '#3367D6' },
  googleButtonDisabled: { opacity: 0.6 },
  googleButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  note: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 20, lineHeight: 20 },
})
