import AudioStreamer from '../components/AudioStreamer'

export default function UnderstandSalah() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4B0021] to-[#2B0014] text-white p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gold mb-4">
            Understand Salah
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Real-time Arabic transcription and translation for prayer assistance
          </p>
        </div>

        {/* Audio Streamer - Full Focus */}
        <div className="bg-midnight/50 border border-gold/20 rounded-lg p-6 md:p-8">
          <AudioStreamer />
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Enable your microphone and speak clearly in Arabic for real-time transcription and translation
          </p>
        </div>
      </div>
    </div>
  )
}
