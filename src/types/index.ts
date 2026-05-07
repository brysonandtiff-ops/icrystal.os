export interface User {
  id: string
  email: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  specimen_count: number
  follower_count: number
  following_count: number
  created_at: string
}

export interface Specimen {
  id: string
  user_id: string
  user?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>
  mineral_name: string
  mineral_group: string | null
  variety: string | null
  locality: string | null
  locality_country: string | null
  lat: number | null
  lng: number | null
  obfuscated_lat: number | null
  obfuscated_lng: number | null
  location_precision: number
  description: string | null
  crystal_system: string | null
  luster: string | null
  color: string | null
  hardness: number | null
  photos: SpecimenPhoto[]
  is_public: boolean
  quality_grade: 'needs_id' | 'community' | 'research'
  ai_identified: boolean
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface SpecimenPhoto {
  id: string
  specimen_id: string
  storage_path: string
  url: string
  is_primary: boolean
  width: number | null
  height: number | null
}

export interface Comment {
  id: string
  specimen_id: string
  user_id: string
  user?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>
  body: string
  created_at: string
}

export interface AIIdentification {
  top_candidates: AICandidate[]
  confidence: number
  model: string
  disambiguation_questions?: DisambiguationQuestion[]
}

export interface AICandidate {
  mineral_name: string
  mineral_group: string
  confidence: number
  description: string
  distinguishing_features: string[]
  similar_minerals: string[]
}

export interface DisambiguationQuestion {
  id: string
  question: string
  options: string[]
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'comment' | 'like' | 'follow' | 'identification'
  actor?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>
  specimen_id?: string
  body: string
  is_read: boolean
  created_at: string
}

export type QualityGrade = 'needs_id' | 'community' | 'research'
export type LocationPrecision = 0 | 5 | 10 | 50
