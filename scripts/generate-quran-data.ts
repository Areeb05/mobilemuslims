/**
 * Script to generate optimized Quran JSON files for client-side use.
 * Run with: npx ts-node scripts/generate-quran-data.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const QURAN_API_BASE = 'https://api.alquran.cloud/v1'

interface ApiAyah {
  number: number
  text: string
  numberInSurah: number
}

interface ApiSurah {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  numberOfAyahs: number
  ayahs: ApiAyah[]
}

interface ApiResponse {
  code: number
  status: string
  data: {
    surahs: ApiSurah[]
  }
}

interface QuranVerse {
  s: number  // surah number
  a: number  // ayah number in surah
  t: string  // text
}

interface SurahMeta {
  number: number
  name: string
  nameArabic: string
  englishNameTranslation: string
  ayahCount: number
}

interface QuranData {
  meta: SurahMeta[]
  verses: QuranVerse[]
}

async function fetchQuranEdition(edition: string): Promise<ApiSurah[]> {
  console.log(`Fetching ${edition}...`)
  const response = await fetch(`${QURAN_API_BASE}/quran/${edition}`, {
    headers: { 'Accept-Encoding': 'gzip' }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${edition}: ${response.status}`)
  }
  
  const json = await response.json() as ApiResponse
  return json.data.surahs
}

async function generateQuranData() {
  const outputDir = path.join(__dirname, '..', 'client', 'public', 'quran')
  
  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Fetch Arabic text
  const arabicSurahs = await fetchQuranEdition('quran-uthmani')
  
  // Build metadata
  const meta: SurahMeta[] = arabicSurahs.map(surah => ({
    number: surah.number,
    name: surah.englishName,
    nameArabic: surah.name,
    englishNameTranslation: surah.englishNameTranslation,
    ayahCount: surah.numberOfAyahs
  }))
  
  // Build compact verse array for Arabic
  const arabicVerses: QuranVerse[] = []
  for (const surah of arabicSurahs) {
    for (const ayah of surah.ayahs) {
      arabicVerses.push({
        s: surah.number,
        a: ayah.numberInSurah,
        t: ayah.text
      })
    }
  }
  
  const arabicData: QuranData = { meta, verses: arabicVerses }
  
  // Write Arabic data
  const arabicPath = path.join(outputDir, 'quran-uthmani.json')
  fs.writeFileSync(arabicPath, JSON.stringify(arabicData))
  console.log(`Written: ${arabicPath} (${(fs.statSync(arabicPath).size / 1024).toFixed(1)} KB)`)
  
  // Fetch and save translations
  const translations = ['en.sahih', 'en.yusufali']
  
  for (const edition of translations) {
    const surahs = await fetchQuranEdition(edition)
    
    const verses: QuranVerse[] = []
    for (const surah of surahs) {
      for (const ayah of surah.ayahs) {
        verses.push({
          s: surah.number,
          a: ayah.numberInSurah,
          t: ayah.text
        })
      }
    }
    
    const translationData = { verses }
    const translationPath = path.join(outputDir, `${edition}.json`)
    fs.writeFileSync(translationPath, JSON.stringify(translationData))
    console.log(`Written: ${translationPath} (${(fs.statSync(translationPath).size / 1024).toFixed(1)} KB)`)
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\nDone! Quran data files generated.')
}

generateQuranData().catch(console.error)
