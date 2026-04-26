import { Link } from 'react-router-dom'
import { Instagram, Heart, Mic2, Sparkles, BookOpen, LogIn } from 'lucide-react'

// TikTok icon (not in lucide-react)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)

interface LinkItem {
  label: string
  href: string
  icon: React.ReactNode
  external?: boolean
}

const links: LinkItem[] = [
  {
    label: 'Understand Salah',
    href: '/understandsalah',
    icon: <Mic2 className="h-5 w-5" />,
    external: false,
  },
  {
    label: 'Understand Salah Offline',
    href: '/understandsalahoffline',
    icon: <Mic2 className="h-5 w-5" />,
    external: false,
  },
  {
    label: 'PainFreeSalah sign in',
    href: '/painfreesalah/login',
    icon: <LogIn className="h-5 w-5" />,
    external: false,
  },
  {
    label: 'Quran verse finder',
    href: '/quran-finder',
    icon: <BookOpen className="h-5 w-5" />,
    external: false,
  },
  {
    label: 'Pain Free Salah',
    href: '/painfreesalah',
    icon: <Sparkles className="h-5 w-5" />,
    external: false,
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/mobilemuslims',
    icon: <Instagram className="h-5 w-5" />,
    external: true,
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com/@mobilemuslims',
    icon: <TikTokIcon className="h-5 w-5" />,
    external: true,
  },
  {
    label: 'Support Us',
    href: '/donate',
    icon: <Heart className="h-5 w-5" />,
    external: false,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Brand */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-[#D4D0C8] via-white to-[#E8E4E1] bg-clip-text text-transparent">
            mobilemuslims.com
          </h1>
          <p className="text-gray-400 text-sm">
            Tools for the modern Muslim
          </p>
        </div>

        {/* Links */}
        <div className="space-y-3">
          {links.map((link) => (
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {link.icon}
                <span className="font-medium">{link.label}</span>
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {link.icon}
                <span className="font-medium">{link.label}</span>
              </Link>
            )
          ))}
        </div>

        {/* Footer */}
        <p className="mt-10 text-gray-500 text-xs">
          © {new Date().getFullYear()} mobilemuslims.com
        </p>
      </div>
    </div>
  )
}
