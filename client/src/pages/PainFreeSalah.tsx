import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

type Step = 'qualifier' | 'positions' | 'bodyParts' | 'commitment'

interface SurveyAnswers {
  hasPain: boolean | null
  positions: string[]
  bodyParts: string[]
}

const SALAH_POSITIONS = [
  { id: 'standing', label: 'Standing (Qiyam)', description: 'Standing upright during recitation' },
  { id: 'bowing', label: 'Bowing (Ruku)', description: 'Bending forward with hands on knees' },
  { id: 'prostration', label: 'Prostration (Sujood)', description: 'Forehead, nose, palms, knees, and toes on ground' },
  { id: 'sitting', label: 'Sitting (Juloos/Tashahhud)', description: 'Seated position between prostrations and at end' },
]

const BODY_PARTS = [
  { id: 'toes', label: 'Toes' },
  { id: 'feet', label: 'Feet' },
  { id: 'shins', label: 'Shins' },
  { id: 'knees', label: 'Knees' },
  { id: 'hips', label: 'Hips' },
  { id: 'lowerBack', label: 'Lower Back' },
  { id: 'midBack', label: 'Mid Back' },
  { id: 'upperBack', label: 'Upper Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'elbows', label: 'Elbows' },
  { id: 'hands', label: 'Hands' },
  { id: 'fingers', label: 'Fingers' },
  { id: 'neck', label: 'Neck' },
  { id: 'jaw', label: 'Jaw' },
]

const MultiSelectOption = ({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean
  onClick: () => void
  label: string
  description?: string
}) => (
  <button
    onClick={onClick}
    className={`w-full p-4 rounded-xl border transition-all duration-200 text-left ${
      selected
        ? 'bg-emerald-600/20 border-emerald-500 text-white'
        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
    }`}
    aria-pressed={selected}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      </div>
      {selected && (
        <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 ml-3">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  </button>
)

export default function PainFreeSalah() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('qualifier')
  const [answers, setAnswers] = useState<SurveyAnswers>({
    hasPain: null,
    positions: [],
    bodyParts: [],
  })

  const handleQualifierAnswer = (hasPain: boolean) => {
    setAnswers(prev => ({ ...prev, hasPain }))
    if (hasPain) {
      setStep('positions')
    }
  }

  const togglePosition = (positionId: string) => {
    setAnswers(prev => ({
      ...prev,
      positions: prev.positions.includes(positionId)
        ? prev.positions.filter(p => p !== positionId)
        : [...prev.positions, positionId],
    }))
  }

  const toggleBodyPart = (bodyPartId: string) => {
    setAnswers(prev => ({
      ...prev,
      bodyParts: prev.bodyParts.includes(bodyPartId)
        ? prev.bodyParts.filter(p => p !== bodyPartId)
        : [...prev.bodyParts, bodyPartId],
    }))
  }

  const handleNext = () => {
    if (step === 'positions' && answers.positions.length > 0) {
      setStep('bodyParts')
    } else if (step === 'bodyParts' && answers.bodyParts.length > 0) {
      setStep('commitment')
    }
  }

  const handleCommitment = () => {
    // Navigate to pricing page with survey answers
    navigate('/painfreesalah/pricing', {
      state: {
        positions: answers.positions,
        bodyParts: answers.bodyParts,
      },
    })
  }

  const getStepNumber = () => {
    switch (step) {
      case 'qualifier': return 1
      case 'positions': return 2
      case 'bodyParts': return 3
      case 'commitment': return 4
      default: return 1
    }
  }

  const canProceed = () => {
    if (step === 'positions') return answers.positions.length > 0
    if (step === 'bodyParts') return answers.bodyParts.length > 0
    return false
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </Link>
        
        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((num) => (
            <div
              key={num}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                num <= getStepNumber() ? 'bg-primary w-4' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
        
        <div className="w-16" /> {/* Spacer for alignment */}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Step 1: Qualifier */}
          {step === 'qualifier' && (
            <div className="text-center animate-fade-in">
              <h1 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-[#D4D0C8] via-white to-[#E8E4E1] bg-clip-text text-transparent">
                Pain Free Salah
              </h1>
              <p className="text-gray-400 mb-8 text-lg">
                Do you experience pain or discomfort during Salah?
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => handleQualifierAnswer(true)}
                  className="w-full p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-lg font-medium">Yes, I experience pain</span>
                </button>
                
                <button
                  onClick={() => handleQualifierAnswer(false)}
                  className="w-full p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-lg font-medium">No, I pray comfortably</span>
                </button>
              </div>
            </div>
          )}

          {/* No Pain Exit */}
          {step === 'qualifier' && answers.hasPain === false && (
            <div className="text-center mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-xl animate-fade-in">
              <p className="text-green-400 mb-4">
                Alhamdulillah! It's wonderful that you can pray comfortably.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Return to Home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Step 2: Positions */}
          {step === 'positions' && (
            <div className="animate-fade-in">
              <h2 className="text-xl md:text-2xl font-bold mb-2 text-center">
                Which Salah positions cause you the most discomfort?
              </h2>
              <p className="text-gray-400 mb-6 text-center">
                Select all that apply
              </p>
              
              <div className="space-y-3">
                {SALAH_POSITIONS.map((position) => (
                  <MultiSelectOption
                    key={position.id}
                    selected={answers.positions.includes(position.id)}
                    onClick={() => togglePosition(position.id)}
                    label={position.label}
                    description={position.description}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`w-full mt-6 p-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  canProceed()
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Step 3: Body Parts */}
          {step === 'bodyParts' && (
            <div className="animate-fade-in">
              <h2 className="text-xl md:text-2xl font-bold mb-2 text-center">
                Which body parts hurt during Salah?
              </h2>
              <p className="text-gray-400 mb-6 text-center">
                Select all that apply
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {BODY_PARTS.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => toggleBodyPart(part.id)}
                    className={`p-3 rounded-xl border transition-all duration-200 text-sm font-medium ${
                      answers.bodyParts.includes(part.id)
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                    aria-pressed={answers.bodyParts.includes(part.id)}
                  >
                    {part.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`w-full mt-6 p-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  canProceed()
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Step 4: Commitment */}
          {step === 'commitment' && (
            <div className="text-center animate-fade-in">
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-[#D4D0C8] via-white to-[#E8E4E1] bg-clip-text text-transparent">
                  You don't have to live with this pain.
                </h2>
                <p className="text-gray-400 text-lg">
                  Thousands of Muslims have transformed their prayer experience with our proven program.
                </p>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-xl mb-8">
                <p className="text-gray-300 mb-4">
                  Our Pain Free Salah program includes:
                </p>
                <ul className="text-left space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Targeted exercises for your specific pain points</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Video tutorials for proper form in each position</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Daily routines that fit your schedule</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Progress tracking and personalized adjustments</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleCommitment}
                className="w-full p-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Yes, I'm Ready to Pray Pain-Free
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
