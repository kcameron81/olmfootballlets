import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList, Alert } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Profile } from '../../lib/types'

export default function Settings() {
  const { profile, isLeadCoach, signOut } = useAuth()
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([])

  useEffect(() => {
    if (isLeadCoach) fetchPendingUsers()
  }, [isLeadCoach])

  async function fetchPendingUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('approved', false)
      .order('created_at')
    if (!error) setPendingUsers(data ?? [])
  }

  async function approveUser(userId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('id', userId)
    if (error) Alert.alert('Error', error.message)
    else fetchPendingUsers()
  }

  async function rejectUser(userId: string) {
    Alert.alert('Reject User', 'This will delete their account. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          await supabase.from('profiles').delete().eq('id', userId)
          fetchPendingUsers()
        }
      }
    ])
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/(auth)/login')
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          <View style={styles.profileCard}>
            <Image source={require('../../assets/OLM-Football.png')} style={styles.logo} resizeMode="contain" />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.full_name?.[0] ?? profile?.email?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={styles.name}>{profile?.full_name ?? 'User'}</Text>
            <Text style={styles.email}>{profile?.email}</Text>
            <View style={[styles.badge, isLeadCoach ? styles.badgeCoach : styles.badgeViewer]}>
              <Text style={styles.badgeText}>{isLeadCoach ? 'Lead Coach' : 'Viewer'}</Text>
            </View>
          </View>

          {isLeadCoach ? (
            <Text style={styles.sectionTitle}>
              Pending Approvals {pendingUsers.length > 0 ? `(${pendingUsers.length})` : ''}
            </Text>
          ) : null}
        </>
      }
      data={isLeadCoach ? pendingUsers : []}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={styles.pendingCard}>
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingName}>{item.full_name ?? 'Unknown'}</Text>
            <Text style={styles.pendingEmail}>{item.email}</Text>
          </View>
          <TouchableOpacity style={styles.approveBtn} onPress={() => approveUser(item.id)}>
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectUser(item.id)}>
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        isLeadCoach ? <Text style={styles.noPending}>No pending requests</Text> : null
      }
      ListFooterComponent={
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      }
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, borderColor: '#e0e0e0', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  logo: { width: 60, height: 60, marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, color: '#007AFF', fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 4, color: '#1a1a2e' },
  email: { color: '#666', fontSize: 14, marginBottom: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeCoach: { backgroundColor: '#d4edda' },
  badgeViewer: { backgroundColor: '#e2e3e5' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#1a1a2e' },
  pendingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderColor: '#e0e0e0', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  pendingInfo: { flex: 1 },
  pendingName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  pendingEmail: { fontSize: 12, color: '#666' },
  approveBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
  approveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  rejectBtn: { backgroundColor: '#FFE5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 6 },
  rejectBtnText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 13 },
  noPending: { color: '#666', textAlign: 'center', marginBottom: 24 },
  signOutButton: { backgroundColor: '#FF3B30', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
  signOutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
