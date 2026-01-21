import AudioStreamer from '../components/AudioStreamer'

export default function UnderstandSalah() {
  return (
    <div className="min-h-screen bg-black text-white grid place-items-center p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-5xl text-center">
        {/* Minimal Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            Understand Salah
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Real-time Arabic transcription and translation for prayer assistance
          </p>
        </div>

        {/* Audio Streamer - Immersive Focus */}
        <div className="mb-6 md:mb-8">
          <AudioStreamer />
        </div>

        {/* Minimal Instructions */}
        <div>
          <p className="text-gray-500 text-base md:text-lg leading-relaxed">
            Enable your microphone and speak clearly in Arabic
          </p>
        </div>
      </div>
    </div>
  )
}
