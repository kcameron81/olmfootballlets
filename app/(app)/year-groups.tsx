import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { YearGroup } from '../../lib/types'
import { router } from 'expo-router'

export default function YearGroups() {
  const { isLeadCoach } = useAuth()
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    fetchYearGroups()
  }, [])

  async function fetchYearGroups() {
    const { data, error } = await supabase
      .from('year_groups')
      .select('*')
      .order('name')
    if (error) Alert.alert('Error', error.message)
    else setYearGroups(data ?? [])
    setLoading(false)
  }

  async function addYearGroup() {
    if (!newName.trim()) return
    const { error } = await supabase
      .from('year_groups')
      .insert({ name: newName.trim(), description: newDescription.trim() || null })
    if (error) Alert.alert('Error', error.message)
    else {
      setModalVisible(false)
      setNewName('')
      setNewDescription('')
      fetchYearGroups()
    }
  }

  async function deleteYearGroup(id: string) {
    Alert.alert('Delete Year Group', 'This will also delete all pitch fees for this group. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('year_groups').delete().eq('id', id)
          if (error) Alert.alert('Error', error.message)
          else fetchYearGroups()
        }
      }
    ])
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={yearGroups}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/(app)/fees/[id]', params: { id: item.id, name: item.name } })}
            onLongPress={() => isLeadCoach && deleteYearGroup(item.id)}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            {item.description && <Text style={styles.cardSub}>{item.description}</Text>}
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Loading...' : 'No year groups yet'}</Text>}
      />
      {isLeadCoach ? (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Year Group</Text>
            <TextInput style={styles.input} placeholder="Name (e.g. U9)" value={newName} onChangeText={setNewName} />
            <TextInput style={styles.input} placeholder="Description (optional)" value={newDescription} onChangeText={setNewDescription} />
            <TouchableOpacity style={styles.button} onPress={addYearGroup}>
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderColor: '#e0e0e0', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  cardSub: { fontSize: 13, color: '#666', flex: 1 },
  cardArrow: { fontSize: 24, color: '#ddd' },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#007AFF', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1a1a2e' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: '#007AFF', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#666', fontSize: 16 },
})
