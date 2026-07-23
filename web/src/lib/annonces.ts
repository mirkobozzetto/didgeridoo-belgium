import { API_BASE } from './pb'

// Domaine annonces : types, libellés et helpers partagés entre les pages
// publiques, l'espace auteur et l'admin. Une seule source de vérité.

export interface AnnonceRecord {
  id: string
  title: string
  category: string
  price?: string
  description?: string
  contact_email?: string
  photos?: string[]
  status?: string
  rejection_reason?: string
  published_at?: string
  expires_at?: string
  expand?: { author?: { name?: string; email?: string } }
}

export const ANNONCE_CATEGORIES: Record<string, string> = {
  vente_instrument: "Vente d'instrument",
  cours: 'Cours',
  artisanat: 'Artisanat',
  covoiturage: 'Covoiturage',
  autre: 'Autre',
}

export function annonceCategoryLabel(key: string): string {
  return ANNONCE_CATEGORIES[key] ?? key
}

export function annoncePhotoUrl(
  ann: AnnonceRecord,
  photo: string,
  thumb = '',
): string {
  const suffix = thumb ? `?thumb=${thumb}` : ''
  return `${API_BASE}/pb/api/files/annonces/${ann.id}/${photo}${suffix}`
}

export function annonceFirstPhotoUrl(
  ann: AnnonceRecord,
  thumb = '',
): string | null {
  if (!ann.photos?.length) return null
  return annoncePhotoUrl(ann, ann.photos[0], thumb)
}

export function annonceIsExpired(ann: AnnonceRecord): boolean {
  if (!ann.expires_at) return false
  return new Date(ann.expires_at.replace(' ', 'T')) < new Date()
}
