#!/usr/bin/env node
/**
 * Downloads risan/quran-json quran_en.json (Arabic + Sahih Intl English per verse)
 * and writes a flat JSON array for the app: { surah, ayah, arabic, english }[]
 *
 * License: MIT (https://github.com/risan/quran-json)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const SOURCE_URL =
  'https://raw.githubusercontent.com/risan/quran-json/main/dist/quran_en.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../client/src/data/quran/ayahs.json')

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

const chapters = await fetchJson(SOURCE_URL)
const ayahs = []

for (const ch of chapters) {
  const surah = ch.id
  for (const v of ch.verses) {
    ayahs.push({
      surah,
      ayah: v.id,
      arabic: v.text,
      english: v.translation ?? '',
    })
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(ayahs), 'utf8')
console.log(`Wrote ${ayahs.length} ayahs to ${OUT}`)
