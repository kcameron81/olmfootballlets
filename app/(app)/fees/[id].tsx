import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ScrollView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Calendar } from 'react-native-calendars'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { PitchFee } from '../../../lib/types'

export default function Fees() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>()
  const { isLeadCoach } = useAuth()
  const [fees, setFees] = useState<PitchFee[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [amount, setAmount] = useState('')
  const [feeDate, setFeeDate] = useState('')
  const [notes, setNotes] = useState('')
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

  useEffect(() => {
    fetchFees()
  }, [id])

  async function fetchFees() {
    const { data, error } = await supabase
      .from('pitch_fees')
      .select('*')
      .eq('year_group_id', id)
      .order('fee_date', { ascending: false })
    if (error) Alert.alert('Error', error.message)
    else setFees(data ?? [])
    setLoading(false)
  }

  function getMonthlyTotal() {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return fees
      .filter(f => {
        const d = new Date(f.fee_date)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, f) => sum + f.amount, 0)
  }

  async function addFee() {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || !feeDate.trim()) {
      Alert.alert('Validation', 'Please enter a valid amount and date (YYYY-MM-DD)')
      return
    }
    const { error } = await supabase.from('pitch_fees').insert({
      year_group_id: id,
      amount: parsed,
      fee_date: feeDate.trim(),
      notes: notes.trim() || null,
    })
    if (error) Alert.alert('Error', error.message)
    else {
      setModalVisible(false)
      setAmount('')
      setFeeDate('')
      setNotes('')
      fetchFees()
    }
  }

  async function deleteFee(feeId: string) {
    Alert.alert('Delete Fee', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('pitch_fees').delete().eq('id', feeId)
          if (error) Alert.alert('Error', error.message)
          else fetchFees()
        }
      }
    ])
  }

  const monthlyTotal = getMonthlyTotal()

  function getMarkedDates() {
    const marked: { [date: string]: any } = {}
    fees.forEach(fee => {
      marked[fee.fee_date] = { marked: true, dotColor: '#007AFF' }
    })
    return marked
  }

  function getFeesForDate(date: string) {
    return fees.filter(f => f.fee_date === date)
  }

  function handleDatePress(date: string) {
    setSelectedDate(date)
    setFeeDate(date)
    setAmount('')
    setNotes('')
    setModalVisible(true)
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>This Month's Total</Text>
        <Text style={styles.summaryAmount}>£{monthlyTotal.toFixed(2)}</Text>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity 
          style={[styles.toggleButton, view === 'calendar' && styles.toggleButtonActive]}
          onPress={() => setView('calendar')}
        >
          <Text style={[styles.toggleText, view === 'calendar' && styles.toggleTextActive]}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, view === 'list' && styles.toggleButtonActive]}
          onPress={() => setView('list')}
        >
          <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>List</Text>
        </TouchableOpacity>
      </View>

      {view === 'calendar' ? (
        <ScrollView style={styles.calendarContainer} showsVerticalScrollIndicator={false}>
          <Calendar
            markedDates={getMarkedDates()}
            onDayPress={(day) => handleDatePress(day.dateString)}
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: '#1a1a2e',
              textSectionTitleDisabledColor: '#ccc',
              selectedDayBgColor: '#007AFF',
              selectedDayTextColor: '#fff',
              todayTextColor: '#007AFF',
              dayTextColor: '#1a1a2e',
              textDisabledColor: '#ccc',
              dotColor: '#007AFF',
              selectedDotColor: '#fff',
              monthTextColor: '#1a1a2e',
              indicatorColor: '#007AFF',
              arrowColor: '#007AFF',
              weekVerticalMargin: 5,
            }}
          />
          {selectedDate ? (
            <View style={styles.dateDetails}>
              <Text style={styles.dateDetailsTitle}>Training on {selectedDate}</Text>
              {getFeesForDate(selectedDate).map(fee => (
                <View key={fee.id} style={styles.feeItem}>
                  <View style={styles.feeInfo}>
                    <Text style={styles.feeAmount}>£{fee.amount.toFixed(2)}</Text>
                    {fee.notes ? <Text style={styles.feeNotes}>{fee.notes}</Text> : null}
                  </View>
                  {isLeadCoach ? (
                    <TouchableOpacity onPress={() => deleteFee(fee.id)}>
                      <Text style={styles.deleteButton}>Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              {isLeadCoach ? (
                <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                  <Text style={styles.addButtonText}>+ Add Fee</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <FlatList
          data={fees}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.amount}>£{item.amount.toFixed(2)}</Text>
                <Text style={styles.date}>{item.fee_date}</Text>
                {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              </View>
              {isLeadCoach ? (
                <TouchableOpacity onPress={() => deleteFee(item.id)}>
                  <Text style={styles.delete}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Loading...' : 'No fees recorded yet'}</Text>}
        />
      )}
      {isLeadCoach ? (
        <TouchableOpacity style={styles.fab} onPress={() => { setSelectedDate(''); setModalVisible(true) }}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Pitch Fee</Text>
            <TextInput style={styles.input} placeholder="Amount (e.g. 45.00)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={feeDate} onChangeText={setFeeDate} />
            <TextInput style={styles.input} placeholder="Notes (optional)" value={notes} onChangeText={setNotes} />
            <TouchableOpacity style={styles.button} onPress={addFee}>
              <Text style={styles.buttonText}>Add Fee</Text>
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
  summary: { backgroundColor: '#f9f9f9', padding: 20, alignItems: 'center', borderBottomColor: '#e0e0e0', borderBottomWidth: 1 },
  summaryLabel: { color: '#666', fontSize: 14 },
  summaryAmount: { color: '#007AFF', fontSize: 36, fontWeight: 'bold' },
  viewToggle: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomColor: '#e0e0e0', borderBottomWidth: 1 },
  toggleButton: { flex: 1, paddingVertical: 8, alignItems: 'center', marginHorizontal: 4, borderRadius: 6, backgroundColor: '#f5f5f5' },
  toggleButtonActive: { backgroundColor: '#007AFF' },
  toggleText: { fontSize: 14, color: '#666', fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  calendarContainer: { flex: 1, padding: 16 },
  dateDetails: { marginTop: 20, paddingBottom: 20 },
  dateDetailsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#1a1a2e' },
  feeItem: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feeInfo: { flex: 1 },
  feeAmount: { fontSize: 14, fontWeight: 'bold', color: '#007AFF' },
  feeNotes: { fontSize: 12, color: '#666', marginTop: 4 },
  deleteButton: { color: '#FF3B30', fontWeight: '600', padding: 8 },
  addButton: { backgroundColor: '#007AFF', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderColor: '#e0e0e0', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  cardLeft: { flex: 1 },
  amount: { fontSize: 20, fontWeight: 'bold' },
  date: { color: '#666', fontSize: 13, marginTop: 2 },
  notes: { color: '#666', fontSize: 12, marginTop: 4 },
  delete: { color: '#FF3B30', fontSize: 18, padding: 4 },
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
