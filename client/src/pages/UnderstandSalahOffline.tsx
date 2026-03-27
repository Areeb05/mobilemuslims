import OfflineAudioStreamer from '../components/OfflineAudioStreamer'

export default function UnderstandSalahOffline() {
  return (
    <div className="min-h-screen bg-black text-white p-3 md:p-4 lg:p-6">
      <div className="text-center mb-3 md:mb-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight">Understand Salah</h1>
        <p className="text-sm md:text-base text-gray-400 mt-1">Real-time Arabic to English translation</p>
      </div>

      <OfflineAudioStreamer />
    </div>
  )
}
