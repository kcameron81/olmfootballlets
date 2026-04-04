import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, Platform } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { PitchBooking, YearGroup } from '../../lib/types'

const PITCHES = [
  'Woodfarm 11s (Astro)',
  'GHA 11s (Astro)',
  'Williamwood 11s (Astro)',
  'Maidenhill 9s (Astro)',
  'Muirend Pitches (Grass)',
  'Woodfarm 5s Cages (Astro)',
  'Muirend 5s Cages (Astro)',
]

const GROUP_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF2D55', '#FFCC00']
const PITCH_GREEN = '#4a9e4a'
const PITCH_GREEN_ALT = '#3d8a3d'
const PITCH_GREEN_SELECTED = '#2ecc71'
const PITCH_GREEN_BOOKED = '#c0392b'
const LINE = '#ffffff'

const CAGE_COUNTS: Record<string, number> = {
  'Woodfarm 5s Cages (Astro)': 3,
  'Muirend 5s Cages (Astro)': 2,
}

const CAGE_LABEL_OVERRIDES: Record<string, string[]> = {
  'Muirend 5s Cages (Astro)': ['5s Pitch 1 & 2', '5s Pitch 3 & 4'],
}

const QUARTER_PITCHES = ['GHA 11s (Astro)']
const QUARTER_KEYS = ['q1', 'q2', 'q3', 'q4']
const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4']

function getCageLabels(pitchName: string, count: number) {
  return CAGE_LABEL_OVERRIDES[pitchName] ?? Array.from({ length: count }, (_, i) => `5s Pitch ${i + 1}`)
}

function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]} ${d} ${MONTHS[m - 1]} ${y}`
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value.split(':')
  const hh = parts[0] ?? ''
  const mm = parts[1] ?? ''

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
    <View style={timeStyles.wrapper}>
      <View style={timeStyles.spinnerCol}>
        <TouchableOpacity onPress={() => stepHH(1)} style={timeStyles.arrow}><Text style={timeStyles.arrowText}>▲</Text></TouchableOpacity>
        <TextInput style={timeStyles.segment} value={hh} onChangeText={v => onChange(v.replace(/\D/g,'').slice(0,2) + ':' + mm)} selectTextOnFocus placeholder="HH" keyboardType="number-pad" maxLength={2} />
        <TouchableOpacity onPress={() => stepHH(-1)} style={timeStyles.arrow}><Text style={timeStyles.arrowText}>▼</Text></TouchableOpacity>
      </View>
      <Text style={timeStyles.colon}>:</Text>
      <View style={timeStyles.spinnerCol}>
        <TouchableOpacity onPress={() => stepMM(1)} style={timeStyles.arrow}><Text style={timeStyles.arrowText}>▲</Text></TouchableOpacity>
        <TextInput style={timeStyles.segment} value={mm} onChangeText={v => onChange(hh + ':' + v.replace(/\D/g,'').slice(0,2))} selectTextOnFocus placeholder="MM" keyboardType="number-pad" maxLength={2} />
        <TouchableOpacity onPress={() => stepMM(-1)} style={timeStyles.arrow}><Text style={timeStyles.arrowText}>▼</Text></TouchableOpacity>
      </View>
    </View>
  )
}

const timeStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    backgroundColor: '#fafafa', marginBottom: 4, paddingVertical: 2,
  },
  spinnerCol: { alignItems: 'center', flex: 1 },
  arrow: { paddingVertical: 2, paddingHorizontal: 8 },
  arrowText: { fontSize: 10, color: '#007AFF' },
  segment: { width: 36, fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#1a1a2e', paddingVertical: 2 },
  colon: { fontSize: 16, fontWeight: '700', color: '#555', paddingHorizontal: 4 },
})

function FullPitch({ selectedHalf, pitchBooked, onToggle }: {
  selectedHalf: string | null
  pitchBooked: boolean
  onToggle: (half: string) => void
}) {
  function halfBg(half: 'top' | 'bottom') {
    if (selectedHalf === half) return PITCH_GREEN_SELECTED
    if (pitchBooked) return PITCH_GREEN_BOOKED
    return half === 'top' ? PITCH_GREEN : PITCH_GREEN_ALT
  }

  return (
    <View style={styles.pitch}>
      <TouchableOpacity activeOpacity={0.8} style={[styles.half, { backgroundColor: halfBg('top') }]} onPress={() => onToggle('top')}>
        <View style={styles.goalTop} />
        <View style={styles.penaltyBoxTop}><View style={styles.sixYardTop} /></View>
        <View style={styles.centreCircleTop} />
        <Text style={styles.halfLabel}>{selectedHalf === 'top' ? '✓ Selected' : pitchBooked ? '🔴 Booked' : 'Top Half'}</Text>
      </TouchableOpacity>
      <View style={styles.halfwayLine}><View style={styles.centreDot} /></View>
      <TouchableOpacity activeOpacity={0.8} style={[styles.half, { backgroundColor: halfBg('bottom') }]} onPress={() => onToggle('bottom')}>
        <View style={styles.centreCircleBottom} />
        <View style={styles.penaltyBoxBottom}><View style={styles.sixYardBottom} /></View>
        <View style={styles.goalBottom} />
        <Text style={styles.halfLabel}>{selectedHalf === 'bottom' ? '✓ Selected' : pitchBooked ? '🔴 Booked' : 'Bottom Half'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const WHOLE_PITCH_ONLY = ['Maidenhill 9s (Astro)']

function SinglePitch({ selected, pitchBooked, onToggle }: {
  selected: boolean; pitchBooked: boolean; onToggle: () => void
}) {
  const bg = selected ? PITCH_GREEN_SELECTED : pitchBooked ? PITCH_GREEN_BOOKED : PITCH_GREEN
  return (
    <TouchableOpacity activeOpacity={0.8} style={[styles.pitch, { height: 362 }]} onPress={onToggle}>
      <View style={[styles.half, { backgroundColor: bg }]}>
        <View style={styles.goalTop} />
        <View style={styles.penaltyBoxTop}><View style={styles.sixYardTop} /></View>
        <View style={styles.centreCircleTop} />
      </View>
      <View style={styles.halfwayLine}><View style={styles.centreDot} /></View>
      <View style={[styles.half, { backgroundColor: bg }]}>
        <View style={styles.centreCircleBottom} />
        <View style={styles.penaltyBoxBottom}><View style={styles.sixYardBottom} /></View>
        <View style={styles.goalBottom} />
        <Text style={styles.halfLabel}>{selected ? '✓ Selected' : pitchBooked ? '🔴 Booked' : 'Full Pitch'}</Text>
      </View>
    </TouchableOpacity>
  )
}

function MiniPitch({ label, selected, booked, bg, onToggle }: {
  label: string; selected: boolean; booked: boolean; bg: string; onToggle: () => void
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={[styles.miniPitch, { backgroundColor: bg }]} onPress={onToggle}>
      {/* Goal top */}
      <View style={{ position: 'absolute', top: 0, alignSelf: 'center', width: 28, height: 8, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: LINE }} />
      {/* Centre line */}
      <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: LINE }} />
      {/* Goal bottom */}
      <View style={{ position: 'absolute', bottom: 0, alignSelf: 'center', width: 28, height: 8, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: LINE }} />
      <Text style={styles.halfLabel}>{selected ? '✓' : booked ? '🔴' : label}</Text>
    </TouchableOpacity>
  )
}

function QuarterPitch({ selectedSections, pitchBooked, onToggle }: {
  selectedSections: Set<string>; pitchBooked: boolean; onToggle: (key: string) => void
}) {
  const keys = ['q1', 'q2', 'q3', 'q4']
  const labels = ['Pitch 1', 'Pitch 2', 'Pitch 3', 'Pitch 4']
  function qBg(key: string, i: number) {
    if (selectedSections.has(key)) return PITCH_GREEN_SELECTED
    if (pitchBooked) return PITCH_GREEN_BOOKED
    return i % 2 === 0 ? PITCH_GREEN : PITCH_GREEN_ALT
  }
  return (
    <View style={styles.quarterGrid}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {keys.slice(0, 2).map((k, i) => (
          <MiniPitch key={k} label={labels[i]} selected={selectedSections.has(k)} booked={pitchBooked} bg={qBg(k, i)} onToggle={() => onToggle(k)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {keys.slice(2).map((k, i) => (
          <MiniPitch key={k} label={labels[i + 2]} selected={selectedSections.has(k)} booked={pitchBooked} bg={qBg(k, i)} onToggle={() => onToggle(k)} />
        ))}
      </View>
    </View>
  )
}

const CAGE_DISABLED: Record<string, number[]> = {
  'Muirend 5s Cages (Astro)': [1],
  'Woodfarm 5s Cages (Astro)': [0],
}

const MUIREND_GRASS = 'Muirend Pitches (Grass)'
const NINES_W = 148
const NINES_H = 90
const SEVENS_W = 92
const SEVENS_H = 112
const MUIREND_GAP = 5

function CagePitch({ pitchName, index, label, selected, booked, onToggle }: {
  pitchName: string; index: number; label: string; selected: boolean; booked: boolean; onToggle: () => void
}) {
  const disabled = (CAGE_DISABLED[pitchName] ?? []).includes(index)
  const bg = disabled ? '#ccc' : selected ? PITCH_GREEN_SELECTED : booked ? PITCH_GREEN_BOOKED : index % 2 === 0 ? PITCH_GREEN : PITCH_GREEN_ALT
  return (
    <TouchableOpacity activeOpacity={disabled ? 1 : 0.8} style={[styles.cage, { backgroundColor: bg }]} onPress={disabled ? undefined : onToggle} disabled={disabled}>
      {disabled ? null : <View style={styles.cageGoalTop} />}
      {disabled ? null : <View style={styles.cageCentreLine} />}
      {disabled ? null : <View style={styles.cageGoalBottom} />}
      <Text style={[styles.cageLabel, disabled ? { color: '#888' } : null]}>{disabled ? 'Unavailable' : selected ? '✓' : booked ? '🔴 Booked' : label}</Text>
    </TouchableOpacity>
  )
}

function MuirendGrassPitches({ selectedSections, pitchBooked, onToggle }: {
  selectedSections: Set<string>; pitchBooked: boolean; onToggle: (key: string) => void
}) {
  function bg(key: string, alt = false) {
    if (selectedSections.has(key)) return PITCH_GREEN_SELECTED
    if (pitchBooked) return PITCH_GREEN_BOOKED
    return alt ? PITCH_GREEN_ALT : PITCH_GREEN
  }

  const totalW = NINES_W * 2 + MUIREND_GAP
  const sevensLeft = totalW - SEVENS_W
  const sevensTop2 = SEVENS_H + MUIREND_GAP
  const ninesTop = SEVENS_H * 2 + MUIREND_GAP * 2
  const totalH = ninesTop + NINES_H

  const ninesPitchMarkings = (
    <>
      {/* Goal left */}
      <View style={{ position: 'absolute', left: 0, top: '50%', marginTop: -14, height: 28, width: 8, borderRightWidth: 1.5, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: LINE }} />
      {/* Penalty area left */}
      <View style={{ position: 'absolute', left: 8, top: '50%', marginTop: -22, height: 44, width: 28, borderRightWidth: 1.5, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: LINE }} />
      {/* Centre line */}
      <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: LINE }} />
      {/* Centre circle */}
      <View style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -19, marginTop: -19, width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: LINE }} />
      {/* Penalty area right */}
      <View style={{ position: 'absolute', right: 8, top: '50%', marginTop: -22, height: 44, width: 28, borderLeftWidth: 1.5, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: LINE }} />
      {/* Goal right */}
      <View style={{ position: 'absolute', right: 0, top: '50%', marginTop: -14, height: 28, width: 8, borderLeftWidth: 1.5, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: LINE }} />
    </>
  )

  const sevensPitchMarkings = (
    <>
      {/* Goal top */}
      <View style={{ position: 'absolute', top: 0, alignSelf: 'center', width: 24, height: 7, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: LINE }} />
      {/* Penalty area top */}
      <View style={{ position: 'absolute', top: 7, alignSelf: 'center', width: 44, height: 20, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: LINE }} />
      {/* Centre line */}
      <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: LINE }} />
      {/* Penalty area bottom */}
      <View style={{ position: 'absolute', bottom: 7, alignSelf: 'center', width: 44, height: 20, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: LINE }} />
      {/* Goal bottom */}
      <View style={{ position: 'absolute', bottom: 0, alignSelf: 'center', width: 24, height: 7, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: LINE }} />
    </>
  )

  return (
    <View style={{ width: totalW, height: totalH }}>
      {/* 7s Pitch 1 — top, right-aligned above the right 9s pitch */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => onToggle('7s_top')}
        style={{ position: 'absolute', left: sevensLeft, top: 0, width: SEVENS_W, height: SEVENS_H,
          backgroundColor: bg('7s_top'), borderWidth: 1.5, borderColor: LINE, borderRadius: 3, overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center' }}>
        {sevensPitchMarkings}
        <Text style={[styles.halfLabel, { fontSize: 12 }]}>{selectedSections.has('7s_top') ? '✓' : pitchBooked ? '🔴' : '7s Pitch 1'}</Text>
      </TouchableOpacity>

      {/* 7s Pitch 2 — below Pitch 1 */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => onToggle('7s_bottom')}
        style={{ position: 'absolute', left: sevensLeft, top: sevensTop2, width: SEVENS_W, height: SEVENS_H,
          backgroundColor: bg('7s_bottom', true), borderWidth: 1.5, borderColor: LINE, borderRadius: 3, overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center' }}>
        {sevensPitchMarkings}
        <Text style={[styles.halfLabel, { fontSize: 12 }]}>{selectedSections.has('7s_bottom') ? '✓' : pitchBooked ? '🔴' : '7s Pitch 2'}</Text>
      </TouchableOpacity>

      {/* 9s Pitch 1 — bottom left */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => onToggle('9s_left')}
        style={{ position: 'absolute', left: 0, top: ninesTop, width: NINES_W, height: NINES_H,
          backgroundColor: bg('9s_left'), borderWidth: 1.5, borderColor: LINE, borderRadius: 3, overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center' }}>
        {ninesPitchMarkings}
        <Text style={styles.halfLabel}>{selectedSections.has('9s_left') ? '✓' : pitchBooked ? '🔴' : '9s Pitch 1'}</Text>
      </TouchableOpacity>

      {/* 9s Pitch 2 — bottom right */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => onToggle('9s_right')}
        style={{ position: 'absolute', right: 0, top: ninesTop, width: NINES_W, height: NINES_H,
          backgroundColor: bg('9s_right', true), borderWidth: 1.5, borderColor: LINE, borderRadius: 3, overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center' }}>
        {ninesPitchMarkings}
        <Text style={styles.halfLabel}>{selectedSections.has('9s_right') ? '✓' : pitchBooked ? '🔴' : '9s Pitch 2'}</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function PitchScreen() {
  const today = localDateString(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedPitch, setSelectedPitch] = useState<string | null>(null)
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())
  const [bookings, setBookings] = useState<PitchBooking[]>([])
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([])

  // Booking modal state
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [bookingType, setBookingType] = useState<'training' | 'match'>('training')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')

  useFocusEffect(useCallback(() => {
    fetchData()
  }, []))

  async function fetchData() {
    const [{ data: b }, { data: g }] = await Promise.all([
      supabase.from('pitch_bookings').select('pitch_name, booking_date, year_group_id, booking_type'),
      supabase.from('year_groups').select('*').order('name'),
    ])
    setBookings((b ?? []) as PitchBooking[])
    setYearGroups(g ?? [])
  }

  function shiftDate(delta: number) {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(y, m - 1, d + delta)
    setSelectedDate(localDateString(next))
    setSelectedSections(new Set())
  }

  const isCages = selectedPitch?.includes('Cages') ?? false
  const isQuarters = selectedPitch ? QUARTER_PITCHES.includes(selectedPitch) : false
  const isGrassMuirend = selectedPitch === MUIREND_GRASS
  const pitchBookedOnDate = bookings.some(b => b.booking_date === selectedDate && b.pitch_name === selectedPitch)

  function handleSelect(p: string) {
    setSelectedPitch(p)
    setSelectedSections(new Set())
  }

  function toggleSection(key: string) {
    setSelectedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openBookingModal() {
    setSelectedGroupId(yearGroups[0]?.id ?? '')
    setBookingType('training')
    setStartTime('')
    setEndTime('')
    setNotes('')
    setModalVisible(true)
  }

  function showAlert(title: string, msg: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${title}: ${msg}`)
    else Alert.alert(title, msg)
  }

  async function saveBooking() {
    if (!selectedGroupId || !selectedPitch) {
      showAlert('Required', 'Please select a year group.')
      return
    }
    if (bookingType === 'match' && selectedPitch.includes('11s')) {
      const [sh, sm] = (startTime || '').split(':').map(Number)
      const [eh, em] = (endTime || '').split(':').map(Number)
      const duration = (eh * 60 + em) - (sh * 60 + sm)
      if (!startTime || !endTime || isNaN(duration) || duration < 120) {
        showAlert('Minimum 2 Hours', '11-a-side matches must be booked for at least 2 hours.')
        return
      }
    }
    const { error } = await supabase.from('pitch_bookings').insert({
      year_group_id: selectedGroupId,
      booking_date: selectedDate,
      pitch_name: selectedPitch,
      start_time: startTime || null,
      end_time: endTime || null,
      notes: notes || null,
      booking_type: bookingType,
    })
    if (error) { showAlert('Error', error.message); return }
    setModalVisible(false)
    fetchData()
  }

  const selectionLabel = () => {
    if (selectedSections.size === 0) return null
    const cageLabels = selectedPitch ? getCageLabels(selectedPitch, CAGE_COUNTS[selectedPitch] ?? 4) : []
    const grassLabels: Record<string, string> = { '9s_left': '9s Pitch 1', '9s_right': '9s Pitch 2', '7s_top': '7s Pitch 1', '7s_bottom': '7s Pitch 2' }
    const parts = Array.from(selectedSections).map(k => {
      if (isGrassMuirend) return grassLabels[k] ?? k
      if (isCages) return cageLabels[parseInt(k)]
      if (isQuarters) return ['Pitch 1','Pitch 2','Pitch 3','Pitch 4'][QUARTER_KEYS.indexOf(k)] ?? k
      if (k === 'full') return 'Full Pitch'
      return k === 'top' ? 'Top Half' : 'Bottom Half'
    })
    return `${selectedPitch} — ${parts.join(', ')}`
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.datePicker}>
        <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity onPress={() => shiftDate(1)} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Select Pitch</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pitchScroll} contentContainerStyle={styles.pitchScrollContent}>
        {PITCHES.map(p => {
          const hasBooking = bookings.some(b => b.booking_date === selectedDate && b.pitch_name === p)
          return (
            <TouchableOpacity
              key={p}
              style={[styles.pitchChip, selectedPitch === p ? styles.pitchChipActive : null, hasBooking && selectedPitch !== p ? styles.pitchChipBooked : null]}
              onPress={() => handleSelect(p)}
            >
              <Text style={[styles.pitchChipText, selectedPitch === p ? styles.pitchChipTextActive : null, hasBooking && selectedPitch !== p ? styles.pitchChipTextBooked : null]}>
                {p}{hasBooking ? ' 🔴' : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {selectedPitch ? (
        <View>
          <Text style={styles.pitchName}>{selectedPitch}</Text>
          {pitchBookedOnDate ? (
            <Text style={styles.bookedNote}>Has bookings on {formatDate(selectedDate)}</Text>
          ) : null}
          <Text style={styles.sectionLabel}>{isQuarters ? 'Select Quarter(s)' : isCages ? 'Select Cage(s)' : isGrassMuirend ? 'Select Pitch(es)' : WHOLE_PITCH_ONLY.includes(selectedPitch) ? 'Select Pitch' : 'Select Half'}</Text>

          <View style={styles.pitchContainer}>
            {isCages ? (
              <View style={styles.cageGrid}>
                {getCageLabels(selectedPitch, CAGE_COUNTS[selectedPitch] ?? 4).map((label, i) => (
                  <CagePitch key={i} pitchName={selectedPitch} index={i} label={label} selected={selectedSections.has(String(i))} booked={pitchBookedOnDate} onToggle={() => toggleSection(String(i))} />
                ))}
              </View>
            ) : isQuarters ? (
              <QuarterPitch
                selectedSections={selectedSections}
                pitchBooked={pitchBookedOnDate}
                onToggle={toggleSection}
              />
            ) : isGrassMuirend ? (
              <MuirendGrassPitches
                selectedSections={selectedSections}
                pitchBooked={pitchBookedOnDate}
                onToggle={toggleSection}
              />
            ) : WHOLE_PITCH_ONLY.includes(selectedPitch) ? (
              <SinglePitch
                selected={selectedSections.has('full')}
                pitchBooked={pitchBookedOnDate}
                onToggle={() => toggleSection('full')}
              />
            ) : (
              <FullPitch
                selectedHalf={selectedSections.has('top') ? 'top' : selectedSections.has('bottom') ? 'bottom' : null}
                pitchBooked={pitchBookedOnDate}
                onToggle={toggleSection}
              />
            )}
          </View>

          {selectionLabel() ? (
            <View style={styles.selectionBanner}>
              <Text style={styles.selectionText}>{selectionLabel()}</Text>
              <TouchableOpacity style={styles.bookBtn} onPress={openBookingModal}>
                <Text style={styles.bookBtnText}>+ Book This Pitch</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚽</Text>
          <Text style={styles.empty}>Select a pitch above to view it</Text>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Book Pitch</Text>
            <Text style={styles.modalSub}>{selectedPitch} · {formatDate(selectedDate)}</Text>

            <Text style={styles.fieldLabel}>Year Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
              {yearGroups.map((g, i) => {
                const color = GROUP_COLORS[i % GROUP_COLORS.length]
                const sel = selectedGroupId === g.id
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.groupChip, { backgroundColor: sel ? color : '#f0f0f0', borderColor: color, borderWidth: 1.5 }]}
                    onPress={() => setSelectedGroupId(g.id)}
                  >
                    <Text style={[styles.groupChipText, { color: sel ? '#fff' : color }]}>{g.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
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

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Start Time</Text>
                <TimeInput value={startTime} onChange={setStartTime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>End Time</Text>
                <TimeInput value={endTime} onChange={setEndTime} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput style={styles.input} placeholder="Any additional info..." value={notes} onChangeText={setNotes} />

            <TouchableOpacity style={styles.button} onPress={saveBooking}>
              <Text style={styles.buttonText}>Confirm Booking · £{bookingType === 'match' ? 70 : 60}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, marginBottom: 8,
    backgroundColor: '#f8f9fa', borderRadius: 12,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  dateArrow: { paddingHorizontal: 20 },
  dateArrowText: { fontSize: 28, color: '#007AFF', fontWeight: '300' },
  dateLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1, textAlign: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 8 },
  pitchScroll: { marginBottom: 4 },
  pitchScrollContent: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  pitchChip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#f0f0f0', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  pitchChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  pitchChipBooked: { borderColor: '#c0392b' },
  pitchChipText: { fontWeight: '600', fontSize: 13, color: '#555' },
  pitchChipTextActive: { color: '#fff' },
  pitchChipTextBooked: { color: '#c0392b' },
  pitchName: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginTop: 12, marginBottom: 2 },
  bookedNote: { fontSize: 12, color: '#c0392b', fontWeight: '500', marginBottom: 4 },
  pitchContainer: { alignItems: 'center', marginTop: 12 },
  pitch: {
    width: 220, borderWidth: 3, borderColor: LINE,
    backgroundColor: PITCH_GREEN, overflow: 'hidden', borderRadius: 4,
  },
  half: { height: 180, width: '100%', alignItems: 'center', justifyContent: 'center' },
  quarterGrid: { gap: 6 },
  miniPitch: { width: 130, height: 160, borderWidth: 2, borderColor: LINE, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  halfLabel: { color: LINE, fontWeight: '700', fontSize: 14 },
  halfwayLine: { height: StyleSheet.hairlineWidth, width: '100%', backgroundColor: LINE, alignItems: 'center', justifyContent: 'center' },
  centreDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: LINE },
  centreCircleTop: { position: 'absolute', bottom: -30, width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: LINE, backgroundColor: 'transparent' },
  centreCircleBottom: { position: 'absolute', top: -30, width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: LINE, backgroundColor: 'transparent' },
  goalTop: { position: 'absolute', top: 0, width: 50, height: 12, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: LINE },
  penaltyBoxTop: { position: 'absolute', top: 12, width: 100, height: 50, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: LINE, alignItems: 'center' },
  sixYardTop: { position: 'absolute', top: 0, width: 60, height: 22, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: LINE },
  goalBottom: { position: 'absolute', bottom: 0, width: 50, height: 12, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: LINE },
  penaltyBoxBottom: { position: 'absolute', bottom: 12, width: 100, height: 50, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: LINE, alignItems: 'center', justifyContent: 'flex-end' },
  sixYardBottom: { position: 'absolute', bottom: 0, width: 60, height: 22, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: LINE },
  cageGrid: { flexDirection: 'column', width: 280, gap: 6 },
  cage: { width: '100%', height: 70, borderWidth: 2, borderColor: LINE, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cageGoalTop: { position: 'absolute', left: 0, top: '50%', marginTop: -15, width: 10, height: 30, borderRightWidth: 2, borderTopWidth: 2, borderBottomWidth: 2, borderColor: LINE },
  cageCentreLine: { position: 'absolute', height: '100%', width: StyleSheet.hairlineWidth, backgroundColor: LINE },
  cageGoalBottom: { position: 'absolute', right: 0, top: '50%', marginTop: -15, width: 10, height: 30, borderLeftWidth: 2, borderTopWidth: 2, borderBottomWidth: 2, borderColor: LINE },
  cageLabel: { color: LINE, fontWeight: '700', fontSize: 13 },
  selectionBanner: { marginTop: 20, backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center', gap: 12 },
  selectionText: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  bookBtn: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  bookBtnText: { color: '#007AFF', fontWeight: '700', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { color: '#999', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  modalSub: { fontSize: 13, color: '#007AFF', fontWeight: '500', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 8 },
  groupChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 4 },
  groupChipText: { fontWeight: '600', fontSize: 13 },
  typeChip: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f0f0f0', borderWidth: 1.5, borderColor: '#e0e0e0' },
  typeChipTraining: { backgroundColor: '#34C759', borderColor: '#34C759' },
  typeChipMatch: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
  typeChipText: { fontWeight: '600', fontSize: 13, color: '#555' },
  typeChipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fafafa', marginBottom: 4 },
  button: { backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelButton: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#999', fontSize: 15 },
})
