import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Play, MessageCircle, LogOut, User, Crown, Clock, HelpCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import AIChatSidebar, { AIChatButton } from '../components/AIChatSidebar'

// Placeholder video data - will be replaced with real content
const VIDEO_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Introduction to the Pain Free Salah program',
    videos: [
      { id: 'intro', title: 'Welcome to Pain Free Salah', duration: '5:30', thumbnail: null },
      { id: 'assessment', title: 'Self-Assessment Guide', duration: '8:15', thumbnail: null },
      { id: 'routine', title: 'Building Your Daily Routine', duration: '6:45', thumbnail: null },
    ],
  },
  {
    id: 'lower-body',
    title: 'Lower Body Mobility',
    description: 'Exercises for knees, hips, and ankles',
    videos: [
      { id: 'knee-warmup', title: 'Knee Warmup Routine', duration: '10:00', thumbnail: null },
      { id: 'hip-mobility', title: 'Hip Mobility for Sujood', duration: '12:30', thumbnail: null },
      { id: 'ankle-flexibility', title: 'Ankle Flexibility Exercises', duration: '8:00', thumbnail: null },
      { id: 'squat-progression', title: 'Squat Progression', duration: '15:00', thumbnail: null },
    ],
  },
  {
    id: 'upper-body',
    title: 'Upper Body & Back',
    description: 'Exercises for back, shoulders, and neck',
    videos: [
      { id: 'back-relief', title: 'Back Pain Relief Routine', duration: '11:00', thumbnail: null },
      { id: 'shoulder-mobility', title: 'Shoulder Mobility', duration: '9:30', thumbnail: null },
      { id: 'neck-exercises', title: 'Neck Tension Release', duration: '7:00', thumbnail: null },
    ],
  },
  {
    id: 'salah-positions',
    title: 'Salah Position Guides',
    description: 'Proper form for each prayer position',
    videos: [
      { id: 'qiyam', title: 'Standing (Qiyam) Alignment', duration: '6:00', thumbnail: null },
      { id: 'ruku', title: 'Bowing (Ruku) Technique', duration: '7:30', thumbnail: null },
      { id: 'sujood', title: 'Prostration (Sujood) Guide', duration: '10:00', thumbnail: null },
      { id: 'juloos', title: 'Sitting (Juloos) Position', duration: '8:00', thumbnail: null },
    ],
  },
]

interface VideoCardProps {
  video: {
    id: string
    title: string
    duration: string
    thumbnail: string | null
  }
  categoryId: string
  onAskAbout: (context: string) => void
}

const VideoCard = ({ video, onAskAbout }: VideoCardProps) => {
  const handleAskClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAskAbout(`I'm looking at the exercise: "${video.title}". `)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-colors group cursor-pointer relative">
      {/* Ask AI Button */}
      <button
        onClick={handleAskClick}
        className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
        aria-label={`Ask about ${video.title}`}
        title="Ask AI about this exercise"
      >
        <HelpCircle className="h-4 w-4 text-white" />
      </button>

      {/* Thumbnail */}
      <div className="aspect-video bg-gray-800 relative flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="w-12 h-12 bg-emerald-600/80 rounded-full flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
          <Play className="h-5 w-5 text-white ml-0.5" />
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {video.duration}
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm text-white line-clamp-2">{video.title}</h4>
      </div>
    </div>
  )
}

export default function PFSDashboard() {
  const { user, subscription, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChatSidebar, setShowChatSidebar] = useState(false)
  const [chatContext, setChatContext] = useState<string | undefined>(undefined)

  const handleAskAbout = (context: string) => {
    setChatContext(context)
    setShowChatSidebar(true)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold bg-gradient-to-r from-[#D4D0C8] via-white to-[#E8E4E1] bg-clip-text text-transparent">
              Pain Free Salah
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Trainer Button */}
            <Link
              to="/painfreesalah/trainer"
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ask Trainer</span>
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300 hidden sm:inline max-w-[120px] truncate">
                  {user?.email}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <p className="text-sm text-gray-400 truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Crown className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-emerald-400">
                        {subscription?.plan_type === 'lifetime' ? 'Lifetime Access' : 'Monthly Plan'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      signOut()
                      setShowUserMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
          <p className="text-gray-400">
            Continue your journey to pain-free prayer. Pick up where you left off or explore new exercises.
          </p>
        </div>

        {/* Video Categories */}
        <div className="space-y-10">
          {VIDEO_CATEGORIES.map((category) => (
            <section key={category.id}>
              <div className="mb-4">
                <h3 className="text-xl font-bold">{category.title}</h3>
                <p className="text-gray-400 text-sm">{category.description}</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.videos.map((video) => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    categoryId={category.id}
                    onAskAbout={handleAskAbout}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl text-center">
          <h3 className="text-lg font-medium mb-2">More Content Coming Soon</h3>
          <p className="text-gray-400 text-sm">
            We're constantly adding new exercises and tutorials. Check back regularly for updates!
          </p>
        </div>
      </main>

      {/* AI Chat Sidebar */}
      <AIChatSidebar 
        isOpen={showChatSidebar} 
        onClose={() => {
          setShowChatSidebar(false)
          setChatContext(undefined)
        }}
        initialContext={chatContext}
      />

      {/* Floating Chat Button (only show when sidebar is closed) */}
      {!showChatSidebar && (
        <AIChatButton onClick={() => setShowChatSidebar(true)} />
      )}
    </div>
  )
}
