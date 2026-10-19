// Anatomical injection sites on the face chart (viewBox 0 0 200 260).
export interface FaceSite { id: string; region: string; label: string; x: number; y: number; defaultUnits: number }

export const FACE_SITES: FaceSite[] = [
  { id: 'fh-l', region: 'Forehead', label: 'Forehead · Left', x: 72, y: 60, defaultUnits: 4 },
  { id: 'fh-c', region: 'Forehead', label: 'Forehead · Center', x: 100, y: 56, defaultUnits: 4 },
  { id: 'fh-r', region: 'Forehead', label: 'Forehead · Right', x: 128, y: 60, defaultUnits: 4 },
  { id: 'gl-l', region: 'Glabella', label: 'Glabella · Left corrugator', x: 88, y: 84, defaultUnits: 5 },
  { id: 'gl-c', region: 'Glabella', label: 'Glabella · Procerus', x: 100, y: 90, defaultUnits: 5 },
  { id: 'gl-r', region: 'Glabella', label: 'Glabella · Right corrugator', x: 112, y: 84, defaultUnits: 5 },
  { id: 'cf-l', region: "Crow's feet", label: "Crow's feet · Left", x: 50, y: 106, defaultUnits: 6 },
  { id: 'cf-r', region: "Crow's feet", label: "Crow's feet · Right", x: 150, y: 106, defaultUnits: 6 },
  { id: 'ck-l', region: 'Cheeks', label: 'Cheek · Left', x: 64, y: 140, defaultUnits: 0 },
  { id: 'ck-r', region: 'Cheeks', label: 'Cheek · Right', x: 136, y: 140, defaultUnits: 0 },
  { id: 'nl-l', region: 'Nasolabial', label: 'Nasolabial · Left', x: 82, y: 166, defaultUnits: 0 },
  { id: 'nl-r', region: 'Nasolabial', label: 'Nasolabial · Right', x: 118, y: 166, defaultUnits: 0 },
  { id: 'lp-u', region: 'Lips', label: 'Upper lip', x: 100, y: 186, defaultUnits: 0 },
  { id: 'lp-l', region: 'Lips', label: 'Lower lip', x: 100, y: 198, defaultUnits: 0 },
  { id: 'mm-l', region: 'Masseter', label: 'Masseter · Left', x: 50, y: 182, defaultUnits: 25 },
  { id: 'mm-r', region: 'Masseter', label: 'Masseter · Right', x: 150, y: 182, defaultUnits: 25 },
  { id: 'jw-l', region: 'Jawline', label: 'Jawline · Left', x: 66, y: 210, defaultUnits: 0 },
  { id: 'jw-r', region: 'Jawline', label: 'Jawline · Right', x: 134, y: 210, defaultUnits: 0 },
  { id: 'ch-c', region: 'Chin', label: 'Chin · Mentalis', x: 100, y: 228, defaultUnits: 4 },
]

export const siteById = (id: string) => FACE_SITES.find((s) => s.id === id)
