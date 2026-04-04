import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ScrollView, Platform,
} from 'react-native'

function showAlert(title: string, msg: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}: ${msg}`)
  } else {
    Alert.alert(title, msg)
  }
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value.split(':')
  const hh = parts[0] ?? ''
  const mm = parts[1] ?? ''

  function handleHH(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    const h = parseInt(digits, 10)
    const clamped = digits.length === 2 && h > 23 ? '23' : digits
    onChange(clamped + ':' + mm)
  }

  function handleMM(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    const m = parseInt(digits, 10)
    const clamped = digits.length === 2 && m > 59 ? '59' : digits
    onChange(hh + ':' + clamped)
  }

  function stepHH(delta: number) {
    const current = parseInt(hh, 10)
    const next = isNaN(current) ? (delta > 0 ? 0 : 23) : (current + delta + 24) % 24
    onChange(pad2(next) + ':' + mm)
  }

  function stepMM(delta: number) {
    const current = parseInt(mm, 10)
    const next = isNaN(current) ? (delta > 0 ? 0 : 59) : (current + delta + 60) % 60
    onChange(hh + ':' + pad2(next))
  }

  return (
    <View style={timeInputStyles.wrapper}>
      <View style={timeInputStyles.spinnerCol}>
        <TouchableOpacity onPress={() => stepHH(1)} style={timeInputStyles.arrow}>
          <Text style={timeInputStyles.arrowText}>▲</Text>
        </TouchableOpacity>
        <TextInput
          style={timeInputStyles.segment}
          value={hh}
          onChangeText={handleHH}
          onFocus={e => e.target.select?.()}
          selectTextOnFocus
          placeholder="HH"
          keyboardType="number-pad"
          maxLength={2}
        />
        <TouchableOpacity onPress={() => stepHH(-1)} style={timeInputStyles.arrow}>
          <Text style={timeInputStyles.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>
      <Text style={timeInputStyles.colon}>:</Text>
      <View style={timeInputStyles.spinnerCol}>
        <TouchableOpacity onPress={() => stepMM(1)} style={timeInputStyles.arrow}>
          <Text style={timeInputStyles.arrowText}>▲</Text>
        </TouchableOpacity>
        <TextInput
          style={timeInputStyles.segment}
          value={mm}
          onChangeText={handleMM}
          onFocus={e => e.target.select?.()}
          selectTextOnFocus
          placeholder="MM"
          keyboardType="number-pad"
          maxLength={2}
        />
        <TouchableOpacity onPress={() => stepMM(-1)} style={timeInputStyles.arrow}>
          <Text style={timeInputStyles.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const timeInputStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    backgroundColor: '#fafafa', marginBottom: 4, paddingVertical: 2,
  },
  spinnerCol: { alignItems: 'center', flex: 1 },
  arrow: { paddingVertical: 2, paddingHorizontal: 8 },
  arrowText: { fontSize: 10, color: '#007AFF' },
  segment: {
    width: 36, fontSize: 16, fontWeight: '600', textAlign: 'center',
    color: '#1a1a2e', paddingVertical: 2,
  },
  colon: { fontSize: 16, fontWeight: '700', color: '#555', paddingHorizontal: 4 },
})
import { Calendar } from 'react-native-calendars'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { YearGroup, PitchBooking } from '../../lib/types'

const GROUP_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF2D55', '#FFCC00']

const PITCH_OPTIONS = [
  'Woodfarm 11s',
  'Woodfarm Cages',
  'GHA 11s',
  'Muirend Cages',
  'Williamwood 11s',
  'Maidenhill 9s',
  'Other',
]
const SESSION_COST = 60

function calcCost(_startTime: string | null, _endTime: string | null): number | null {
  return SESSION_COST
}

export default function CalendarScreen() {
  const { isLeadCoach } = useAuth()
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([])
  const [bookings, setBookings] = useState<PitchBooking[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [modalVisible, setModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [pitchName, setPitchName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [repeatType, setRepeatType] = useState<'none' | 'weekly' | 'fortnightly'>('none')
  const [repeatWeeks, setRepeatWeeks] = useState('4')
  const [bookingType, setBookingType] = useState<'training' | 'match'>('training')
  const [pitchSelection, setPitchSelection] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [{ data: groups, error: gErr }, { data: allBookings, error: bErr }] = await Promise.all([
      supabase.from('year_groups').select('*').order('name'),
      supabase.from('pitch_bookings').select('*, year_groups(name)').order('booking_date'),
    ])
    console.log('fetchData groups:', groups?.length, 'error:', gErr)
    console.log('fetchData bookings:', allBookings?.length, 'error:', bErr)
    setYearGroups(groups ?? [])
    setBookings(allBookings ?? [])
  }

  const colorMap = useCallback((): Record<string, string> => {
    const map: Record<string, string> = {}
    yearGroups.forEach((g, i) => { map[g.id] = GROUP_COLORS[i % GROUP_COLORS.length] })
    return map
  }, [yearGroups])

  const markedDates = useCallback(() => {
    const colors = colorMap()
    const marks: Record<string, any> = {}

    bookings.forEach(b => {
      if (!marks[b.booking_date]) marks[b.booking_date] = { dots: [] }
      const color = colors[b.year_group_id] ?? '#007AFF'
      if (!marks[b.booking_date].dots.find((d: any) => d.color === color)) {
        marks[b.booking_date].dots.push({ color, selectedDotColor: color })
      }
    })

    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: '#007AFF',
    }
    return marks
  }, [bookings, selectedDate, colorMap])

  const selectedBookings = bookings.filter(b => b.booking_date === selectedDate)
  const colors = colorMap()

  function openModal() {
    setEditingId(null)
    setSelectedGroupId(yearGroups[0]?.id ?? '')
    setPitchSelection('')
    setPitchName('')
    setStartTime('')
    setEndTime('')
    setNotes('')
    setRepeatType('none')
    setRepeatWeeks('4')
    setBookingType('training')
    setModalVisible(true)
  }

  function openEditModal(booking: PitchBooking) {
    setEditingId(booking.id)
    setSelectedGroupId(booking.year_group_id)
    const isKnown = PITCH_OPTIONS.includes(booking.pitch_name)
    setPitchSelection(isKnown ? booking.pitch_name : 'Other')
    setPitchName(isKnown ? '' : booking.pitch_name)
    setStartTime(booking.start_time ?? '')
    setEndTime(booking.end_time ?? '')
    setNotes(booking.notes ?? '')
    setRepeatType('none')
    setRepeatWeeks('4')
    setBookingType(booking.booking_type === 'match' ? 'match' : 'training')
    setModalVisible(true)
  }

  function closeModal() {
    setModalVisible(false)
    setEditingId(null)
    setPitchSelection('')
    setPitchName('')
    setStartTime('')
    setEndTime('')
    setNotes('')
    setSelectedGroupId('')
    setRepeatType('none')
    setRepeatWeeks('4')
    setBookingType('training')
  }

  function localDateString(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function generateDates(): string[] {
    const dates: string[] = [selectedDate]
    if (repeatType === 'none') return dates
    const intervalDays = repeatType === 'weekly' ? 7 : 14
    const count = parseInt(repeatWeeks, 10)
    if (isNaN(count) || count < 1) return dates
    const [y, mo, dy] = selectedDate.split('-').map(Number)
    for (let i = 1; i < count; i++) {
      const d = new Date(y, mo - 1, dy + intervalDays * i)
      dates.push(localDateString(d))
    }
    return dates
  }

  async function saveBooking() {
    const resolvedPitch = pitchSelection === 'Other' ? pitchName.trim() : pitchSelection
    if (!selectedGroupId || !resolvedPitch) {
      showAlert('Required', 'Please select a year group and a pitch.')
      return
    }

    if (editingId) {
      const { error } = await supabase.from('pitch_bookings').update({
        year_group_id: selectedGroupId,
        booking_date: selectedDate,
        pitch_name: resolvedPitch,
        start_time: startTime.trim() || null,
        end_time: endTime.trim() || null,
        notes: notes.trim() || null,
        booking_type: bookingType,
      }).eq('id', editingId)
      if (error) { showAlert('Error', error.message); return }
    } else {
      const dates = generateDates()
      const rows = dates.map(d => ({
        year_group_id: selectedGroupId,
        booking_date: d,
        pitch_name: resolvedPitch,
        start_time: startTime.trim() || null,
        end_time: endTime.trim() || null,
        notes: notes.trim() || null,
        booking_type: bookingType,
      }))
      const { error } = await supabase.from('pitch_bookings').insert(rows).select()
      if (error) { showAlert('Error', error.message); return }
    }
    closeModal()
    fetchData()
  }

  async function deleteBooking(id: string) {
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this pitch booking?')) {
        await supabase.from('pitch_bookings').delete().eq('id', id)
        fetchData()
      }
      return
    }
    Alert.alert('Remove Booking', 'Remove this pitch booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await supabase.from('pitch_bookings').delete().eq('id', id)
          fetchData()
        },
      },
    ])
  }

  const dayTotal = selectedBookings.reduce((sum, b) => sum + (calcCost(b.start_time, b.end_time) ?? 0), 0)
  const formattedSelected = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const formattedSelectedShort = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  return (
    <View style={styles.container}>
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates()}
        onDayPress={day => setSelectedDate(day.dateString)}
        theme={{
          todayTextColor: '#007AFF',
          arrowColor: '#007AFF',
          selectedDayBackgroundColor: '#007AFF',
          dotColor: '#007AFF',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textMonthFontWeight: '700',
          calendarBackground: '#fff',
        }}
        style={styles.calendar}
      />

      <View style={styles.dateHeader}>
        <View>
          <Text style={styles.dateLabel}>{formattedSelected}</Text>
          <Text style={styles.bookingCount}>
            {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {dayTotal > 0 ? (
          <Text style={styles.dayCost}>£{dayTotal.toFixed(0)}</Text>
        ) : null}
      </View>

      <FlatList
        data={selectedBookings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const color = colors[item.year_group_id] ?? '#007AFF'
          return (
            <TouchableOpacity
              style={[styles.bookingCard, { borderLeftColor: color }]}
              onPress={() => isLeadCoach ? openEditModal(item) : undefined}
              activeOpacity={isLeadCoach ? 0.6 : 1}
            >
              <View style={styles.bookingTop}>
                <View style={[styles.groupBadge, { backgroundColor: color }]}>
                  <Text style={styles.groupBadgeText}>{item.year_groups?.name ?? ''}</Text>
                </View>
                <View style={[styles.typeBadge, item.booking_type === 'match' ? styles.typeBadgeMatch : styles.typeBadgeTraining]}>
                  <Text style={styles.typeBadgeText}>{item.booking_type === 'match' ? 'Match' : 'Training'}</Text>
                </View>
                {(item.start_time || item.end_time) ? (
                  <Text style={styles.timeText}>
                    {[item.start_time, item.end_time].filter(Boolean).join(' – ')}
                  </Text>
                ) : null}
                {isLeadCoach ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteBooking(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.pitchRow}>
                <Text style={styles.pitchName}>{item.pitch_name}</Text>
                {calcCost(item.start_time, item.end_time) != null ? (
                  <Text style={styles.costText}>£{calcCost(item.start_time, item.end_time)!.toFixed(0)}</Text>
                ) : null}
              </View>
              {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.empty}>No pitches booked for this day</Text>
          </View>
        }
      />

      {isLeadCoach ? (
        <TouchableOpacity style={styles.fab} onPress={openModal}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editingId ? 'Edit Booking' : 'Book a Pitch'}</Text>
            <Text style={styles.modalDate}>{formattedSelectedShort}</Text>

            <Text style={styles.fieldLabel}>Year Group</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.groupScroll}
              contentContainerStyle={styles.groupScrollContent}
            >
              {yearGroups.map((g, i) => {
                const chipColor = GROUP_COLORS[i % GROUP_COLORS.length]
                const selected = selectedGroupId === g.id
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.groupChip,
                      { backgroundColor: selected ? chipColor : '#f0f0f0', borderColor: chipColor, borderWidth: 1.5 },
                    ]}
                    onPress={() => setSelectedGroupId(g.id)}
                  >
                    <Text style={[styles.groupChipText, { color: selected ? '#fff' : chipColor }]}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeChip, bookingType === 'training' ? styles.typeChipTraining : null]}
                onPress={() => setBookingType('training')}
              >
                <Text style={[styles.typeChipText, bookingType === 'training' ? styles.typeChipTextActive : null]}>Training</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChip, bookingType === 'match' ? styles.typeChipMatch : null]}
                onPress={() => setBookingType('match')}
              >
                <Text style={[styles.typeChipText, bookingType === 'match' ? styles.typeChipTextActive : null]}>Match</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Pitch</Text>
            <View style={styles.pitchGrid}>
              {PITCH_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.pitchOption, pitchSelection === opt ? styles.pitchOptionActive : null]}
                  onPress={() => setPitchSelection(opt)}
                >
                  <Text style={[styles.pitchOptionText, pitchSelection === opt ? styles.pitchOptionTextActive : null]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {pitchSelection === 'Other' ? (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Enter pitch name..."
                value={pitchName}
                onChangeText={setPitchName}
                autoFocus
              />
            ) : null}

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Start Time</Text>
                <TimeInput value={startTime} onChange={setStartTime} />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>End Time</Text>
                <TimeInput value={endTime} onChange={setEndTime} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Any additional info..."
              value={notes}
              onChangeText={setNotes}
            />

            {!editingId ? (
              <View>
                <Text style={styles.fieldLabel}>Repeat</Text>
                <View style={styles.repeatRow}>
                  {(['none', 'weekly', 'fortnightly'] as const).map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.repeatChip, repeatType === opt ? styles.repeatChipActive : null]}
                      onPress={() => setRepeatType(opt)}
                    >
                      <Text style={[styles.repeatChipText, repeatType === opt ? styles.repeatChipTextActive : null]}>
                        {opt === 'none' ? 'None' : opt === 'weekly' ? 'Weekly' : 'Fortnightly'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {repeatType !== 'none' ? (
                  <View style={styles.repeatWeeksRow}>
                    <Text style={styles.repeatWeeksLabel}>For</Text>
                    <TextInput
                      style={styles.repeatWeeksInput}
                      value={repeatWeeks}
                      onChangeText={setRepeatWeeks}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={styles.repeatWeeksLabel}>weeks</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity style={styles.button} onPress={saveBooking}>
              <Text style={styles.buttonText}>
                {editingId ? 'Save Changes' : (() => {
                  const count = repeatType !== 'none' ? generateDates().length : 1
                  const cost = calcCost(startTime, endTime)
                  const total = cost ? cost * count : null
                  if (count > 1) return `Add ${count} Bookings${total ? ` · £${total.toFixed(0)}` : ''}`
                  return `Add Booking${total ? ` · £${total.toFixed(0)}` : ''}`
                })()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  calendar: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dateHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  dateLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  bookingCount: { fontSize: 12, color: '#007AFF', fontWeight: '500', marginTop: 2 },
  dayCost: { fontSize: 20, fontWeight: '700', color: '#34C759' },
  list: { padding: 12, paddingBottom: 80 },
  bookingCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderWidth: 1, borderColor: '#e8e8e8',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  bookingTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  groupBadge: {
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginRight: 10,
  },
  groupBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 },
  typeBadgeTraining: { backgroundColor: '#E8F5E9' },
  typeBadgeMatch: { backgroundColor: '#FFF3E0' },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
  timeText: { fontSize: 13, color: '#555', fontWeight: '500', flex: 1 },
  deleteBtn: { marginLeft: 'auto', padding: 4 },
  deleteBtnText: { fontSize: 16, color: '#FF3B30', fontWeight: '600' },
  pitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pitchName: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', flex: 1 },
  costText: { fontSize: 15, fontWeight: '700', color: '#34C759', marginLeft: 8 },
  notesText: { fontSize: 13, color: '#888', marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#999', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#007AFF', width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#007AFF', shadowOpacity: 0.4, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 12, maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  modalDate: { fontSize: 13, color: '#007AFF', fontWeight: '500', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 8 },
  groupScroll: { marginBottom: 4 },
  groupScrollContent: { paddingBottom: 8 },
  groupChip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
  },
  groupChipText: { fontWeight: '600', fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 12, fontSize: 15, backgroundColor: '#fafafa', marginBottom: 4,
  },
  timeRow: { flexDirection: 'row', gap: 8 },
  timeField: { flex: 1 },
  pitchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pitchOption: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#f0f0f0', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  pitchOptionActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  pitchOptionText: { fontWeight: '600', fontSize: 13, color: '#555' },
  pitchOptionTextActive: { color: '#fff' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  typeChip: {
    flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#f0f0f0', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  typeChipTraining: { backgroundColor: '#34C759', borderColor: '#34C759' },
  typeChipMatch: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
  typeChipText: { fontWeight: '600', fontSize: 13, color: '#555' },
  typeChipTextActive: { color: '#fff' },
  repeatRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  repeatChip: {
    flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#f0f0f0', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  repeatChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  repeatChipText: { fontWeight: '600', fontSize: 13, color: '#555' },
  repeatChipTextActive: { color: '#fff' },
  repeatWeeksRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  repeatWeeksLabel: { fontSize: 14, color: '#555', fontWeight: '500' },
  repeatWeeksInput: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    padding: 8, fontSize: 15, backgroundColor: '#fafafa',
    width: 50, textAlign: 'center',
  },
  button: { backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelButton: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#999', fontSize: 15 },
})
