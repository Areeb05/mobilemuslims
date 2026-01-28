import { HelpCircle } from 'lucide-react'

interface VideoContextHelpProps {
  videoTitle: string
  onAskAbout: (context: string) => void
}

export default function VideoContextHelp({ videoTitle, onAskAbout }: VideoContextHelpProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent video card click
    onAskAbout(`I'm watching the video: "${videoTitle}". `)
  }

  return (
    <button
      onClick={handleClick}
      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-emerald-600/80 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
      aria-label={`Ask about ${videoTitle}`}
      title="Ask AI about this exercise"
    >
      <HelpCircle className="h-4 w-4 text-white" />
    </button>
  )
}
