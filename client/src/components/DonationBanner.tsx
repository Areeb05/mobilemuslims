import { Heart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import DonationForm from './DonationForm'

interface DonationBannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function DonationBanner({ open, onOpenChange }: DonationBannerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card/95 border-border/50 backdrop-blur-md p-4">
        <DialogHeader className="text-center space-y-1 pb-2">
          <div className="flex items-center justify-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <DialogTitle className="text-base font-semibold">
              Support Prayer Education
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Help make Islamic prayer tools accessible worldwide
          </p>
        </DialogHeader>

        <DonationForm 
          onCancel={() => onOpenChange(false)}
          showCancelButton={true}
          cancelLabel="Maybe Later"
        />
      </DialogContent>
    </Dialog>
  )
}
