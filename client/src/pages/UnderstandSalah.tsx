import AudioStreamer from '../components/AudioStreamer'

export default function UnderstandSalah() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-3 md:p-4 lg:p-6">
      {/* Compact Header */}
      <div className="text-center py-2 md:py-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight">
          Understand Salah
        </h1>
        <p className="text-sm md:text-base text-gray-400 mt-1">
          Real-time Arabic to English translation
        </p>
      </div>

      {/* Audio Streamer - Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <AudioStreamer />
      </div>
    </div>
  )
}
