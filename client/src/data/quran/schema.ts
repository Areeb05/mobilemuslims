import { z } from 'zod'

/**
 * One ayah with Uthmani-style Arabic and English translation (Sahih International via risan/quran-json).
 */
export const ayahRecordSchema = z.object({
  surah: z.number().int().min(1).max(114),
  ayah: z.number().int().min(1),
  arabic: z.string(),
  english: z.string(),
})

export type AyahRecord = z.infer<typeof ayahRecordSchema>

/** Full bundled corpus file shape. */
export const ayahsFileSchema = z.array(ayahRecordSchema)
