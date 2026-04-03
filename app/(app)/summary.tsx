import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { supabase } from '../../lib/supabase'
import { PitchBooking } from '../../lib/types'

const RATE_PER_HOUR = 60
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function calcCost(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0
  const hours = (eh * 60 + em - (sh * 60 + sm)) / 60
  return hours > 0 ? hours * RATE_PER_HOUR : 0
}

interface YearGroupSummary {
  id: string
  name: string
  monthTotal: number
  allTimeTotal: number
  bookingCount: number
}

export default function Summary() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [yearGroups, setYearGroups] = useState<{ id: string; name: string }[]>([])
  const [allBookings, setAllBookings] = useState<PitchBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [{ data: groups }, { data: bookings }] = await Promise.all([
      supabase.from('year_groups').select('id, name').order('name'),
      supabase.from('pitch_bookings').select('year_group_id, booking_date, start_time, end_time'),
    ])
    setYearGroups(groups ?? [])
    setAllBookings((bookings ?? []) as PitchBooking[])
    setLoading(false)
  }

  function shiftMonth(delta: number) {
    let m = selectedMonth + delta
    let y = selectedYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setSelectedMonth(m)
    setSelectedYear(y)
  }

  const filteredGroups = useMemo(() => {
    return selectedGroupId ? yearGroups.filter(g => g.id === selectedGroupId) : yearGroups
  }, [yearGroups, selectedGroupId])

  const summaries = useMemo((): YearGroupSummary[] => {
    return filteredGroups.map(yg => {
      const groupBookings = allBookings.filter(b => b.year_group_id === yg.id)
      const allTimeTotal = groupBookings.reduce((sum, b) => sum + calcCost(b.start_time, b.end_time), 0)
      const monthTotal = groupBookings
        .filter(b => {
          const d = new Date(b.booking_date)
          return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
        })
        .reduce((sum, b) => sum + calcCost(b.start_time, b.end_time), 0)

      return { id: yg.id, name: yg.name, monthTotal, allTimeTotal, bookingCount: groupBookings.length }
    })
  }, [filteredGroups, allBookings, selectedMonth, selectedYear])

  const grandMonth = summaries.reduce((sum, s) => sum + s.monthTotal, 0)
  const grandAllTime = summaries.reduce((sum, s) => sum + s.allTimeTotal, 0)
  const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`

  return (
    <View style={styles.container}>
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.groupFilter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupFilterContent}
        >
          <TouchableOpacity
            style={[styles.groupChip, !selectedGroupId ? styles.groupChipActive : null]}
            onPress={() => setSelectedGroupId(null)}
          >
            <Text style={[styles.groupChipText, !selectedGroupId ? styles.groupChipTextActive : null]}>All</Text>
          </TouchableOpacity>
          {yearGroups.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupChip, selectedGroupId === g.id ? styles.groupChipActive : null]}
              onPress={() => setSelectedGroupId(selectedGroupId === g.id ? null : g.id)}
            >
              <Text style={[styles.groupChipText, selectedGroupId === g.id ? styles.groupChipTextActive : null]}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.header}>
        <View style={styles.headerItem}>
          <Text style={styles.headerLabel}>{monthLabel}</Text>
          <Text style={styles.headerAmount}>£{grandMonth.toFixed(0)}</Text>
        </View>
      </View>

      <FlatList
        data={summaries}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            <View style={styles.cardRow}>
              <View style={styles.cardStat}>
                <Text style={styles.statLabel}>{MONTH_NAMES[selectedMonth]}</Text>
                <Text style={styles.statValue}>£{item.monthTotal.toFixed(0)}</Text>
              </View>
              <View style={styles.cardStat}>
                <Text style={styles.statLabel}>Bookings</Text>
                <Text style={styles.statValue}>{item.bookingCount}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Loading...' : 'No data yet'}</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  arrow: { paddingHorizontal: 20, paddingVertical: 4 },
  arrowText: { fontSize: 28, color: '#007AFF', fontWeight: '300' },
  monthLabel: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', minWidth: 100, textAlign: 'center' },
  groupFilter: { height: 50, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  groupFilterContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  groupChip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#f0f0f0', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  groupChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  groupChipText: { fontWeight: '600', fontSize: 13, color: '#555' },
  groupChipTextActive: { color: '#fff' },
  header: { backgroundColor: '#f9f9f9', flexDirection: 'row', padding: 20, borderBottomColor: '#e0e0e0', borderBottomWidth: 1 },
  headerItem: { flex: 1, alignItems: 'center' },
  headerLabel: { color: '#666', fontSize: 12, marginBottom: 4 },
  headerAmount: { color: '#007AFF', fontSize: 24, fontWeight: 'bold' },
  divider: { width: 1, backgroundColor: '#e0e0e0' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderColor: '#e0e0e0', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  cardName: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  cardRow: { flexDirection: 'row' },
  cardStat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#666', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
})
