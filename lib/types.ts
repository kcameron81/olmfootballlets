export type UserRole = 'lead_coach' | 'viewer'

export interface Profile {
  id: string
  email: string
  role: UserRole
  full_name: string | null
  approved: boolean
}

export interface YearGroup {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface PitchFee {
  id: string
  year_group_id: string
  amount: number
  fee_date: string
  notes: string | null
  created_at: string
}

export interface YearGroupWithFees extends YearGroup {
  pitch_fees: PitchFee[]
  monthly_total: number
}

export type BookingType = 'training' | 'match'

export interface PitchBooking {
  id: string
  year_group_id: string
  booking_date: string
  pitch_name: string
  start_time: string | null
  end_time: string | null
  notes: string | null
  booking_type: BookingType
  created_at: string
  year_groups?: { name: string }
}
