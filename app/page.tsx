"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronDown, Menu, X, Heart, Activity, Users, HandIcon as PrayingHands, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isMobile = useMobile()
  const sectionsRef = useRef<{ [key: string]: HTMLElement | null }>({
    hero: null,
    community: null,
    testimonials: null,
    cta: null,
  })

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  const fadeInLeft = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  }

  const fadeInRight = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
  }

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      setIsMenuOpen(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#4B0021] text-white">
      {/* Mobile Navigation */}
      <div className="fixed top-0 left-0 w-full z-50 bg-midnight/80 backdrop-blur-md md:hidden">
        <div className="flex justify-between items-center p-4">
          <div className="text-gold font-serif text-xl font-bold flex items-center">
            Mobile Muslims
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gold p-2 focus:outline-none">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rich-black border-t border-gold/20"
          >
            <div className="flex flex-col p-4 space-y-4">
              <button
                onClick={() => scrollToSection("hero")}
                className="text-left py-2 text-white hover:text-gold transition-colors flex items-center"
              >
                <Moon className="h-4 w-4 mr-2 text-gold" strokeWidth={1.5} />
                Home
              </button>
              <button
                onClick={() => scrollToSection("community")}
                className="text-left py-2 text-white hover:text-gold transition-colors flex items-center"
              >
                <Users className="h-4 w-4 mr-2 text-gold" strokeWidth={1.5} />
                Community
              </button>
              <button
                onClick={() => scrollToSection("testimonials")}
                className="text-left py-2 text-white hover:text-gold transition-colors flex items-center"
              >
                <Heart className="h-4 w-4 mr-2 text-gold" strokeWidth={1.5} />
                Testimonials
              </button>
              <Button
                onClick={() => scrollToSection("cta")}
                className="bg-gold hover:bg-gold/90 text-black font-bold w-full flex items-center justify-center"
              >
                <a href="https://buy.stripe.com/eVa4iT2qm3Bt7yU28b">
                  <Sun className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Join Now
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Desktop Navigation */}
      <div className="fixed top-0 left-0 w-full z-50 bg-midnight/80 backdrop-blur-md hidden md:block">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <div className="text-gold font-serif text-2xl font-bold flex items-center">
            Mobile Muslims
          </div>
          <div className="flex items-center space-x-8">
            <button
              onClick={() => scrollToSection("hero")}
              className="text-white hover:text-gold transition-colors flex items-center"
            >
              <Moon className="h-4 w-4 mr-2 text-gold/70" strokeWidth={1.5} />
              Home
            </button>
            <button
              onClick={() => scrollToSection("community")}
              className="text-white hover:text-gold transition-colors flex items-center"
            >
              <Users className="h-4 w-4 mr-2 text-gold/70" strokeWidth={1.5} />
              Community
            </button>
            <button
              onClick={() => scrollToSection("testimonials")}
              className="text-white hover:text-gold transition-colors flex items-center"
            >
              <Heart className="h-4 w-4 mr-2 text-gold/70" strokeWidth={1.5} />
              Testimonials
            </button>
            <Button
              onClick={() => scrollToSection("cta")}
              className="bg-gold hover:bg-gold/90 text-black font-bold flex items-center"
            >
              <a href="https://buy.stripe.com/eVa4iT2qm3Bt7yU28b">
                <Sun className="h-4 w-4 mr-2" strokeWidth={1.5} />
                Join Now
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Hero Section */}
      <section
        id="hero"
        ref={(el) => {
          sectionsRef.current.hero = el;
          return undefined;
        }}
        className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 text-center pt-16 md:pt-0"
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/mosque-dawn.jpg" // Replace with your actual image path
            alt="Serene mosque at dawn"
            fill
            className="object-cover object-center"
            priority
            quality={100}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#4B0021]/80 via-[#4B0021]/70 to-[#4B0021]/90" />
        </div>

        <div className="z-10 max-w-5xl px-4 sm:px-6 lg:px-8 mt-16 md:mt-0">
          {/* Main Heading with Enhanced Animation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-6 md:mb-8"
          >
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-gold tracking-tight leading-none text-shadow-lg font-elegant">
              Reclaim the Full Blessings of Salah
            </h1>
          </motion.div>

          {/* Subheading with Enhanced Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            className="mb-8 md:mb-12"
          >
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl tracking-wide leading-relaxed max-w-3xl mx-auto text-white/90">
              Experience shifa for your body, strengthen your spirit, and stand in prayer pain-free
            </p>
          </motion.div>

          {/* CTA Button with Enhanced Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
            className="mb-16"
          >
            <Button
              asChild
              className="bg-gold hover:bg-gold/90 text-black font-bold text-base sm:text-lg md:text-xl px-6 sm:px-8 md:px-10 py-5 sm:py-6 md:py-7 rounded-md shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-gold/20 uppercase tracking-wider flex items-center"
            >
              <Link href="https://buy.stripe.com/eVa4iT2qm3Bt7yU28b">
                <Sun className="h-5 w-5 mr-2" strokeWidth={1.5} />
                Join Now
              </Link>
            </Button>
          </motion.div>

          {/* Scroll Indicator with Enhanced Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2 hidden md:flex"
            onClick={() => scrollToSection("community")}
          >
            <div className="flex flex-col items-center cursor-pointer group">
              <span className="text-sm text-white/70 mb-2 group-hover:text-gold transition-colors duration-300">
                Discover More
              </span>
              <ChevronDown className="h-8 w-8 text-gold animate-bounce" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community Section with Enhanced Animations */}
      <section
        id="community"
        ref={(el) => {
          sectionsRef.current.community = el;
          return undefined;
        }}
        className="relative flex min-h-screen w-full flex-col items-center justify-center bg-rich-black px-4 py-16 md:py-20 text-center overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-repeat bg-center" />
        </div>

        <motion.div
          className="max-w-4xl z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-3">
            <Users className="h-12 w-12 mx-auto text-gold" strokeWidth={1} />
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="mb-6 md:mb-8 font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gold tracking-tight leading-tight text-shadow"
          >
            Join Our Community
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="mb-8 md:mb-10 text-base sm:text-lg md:text-xl leading-relaxed tracking-wide max-w-3xl mx-auto"
          >
            Become part of an active community dedicated to pain-free Salah. For just $1/month, gain access to
            personalized guidance, exclusive resources, and ongoing support.
          </motion.p>

          <motion.div variants={fadeInUp} transition={{ duration: 0.8 }} className="mb-12 md:mb-16">
            <Button
              asChild
              className="bg-gold hover:bg-gold/90 text-black font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-md shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-gold/20 flex items-center mx-auto"
            >
              <Link href="https://buy.stripe.com/eVa4iT2qm3Bt7yU28b">
                <Sun className="h-5 w-5 mr-2" strokeWidth={1.5} />
                Join Now
              </Link>
            </Button>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
          >
            <motion.div variants={fadeInLeft} transition={{ duration: 0.6 }}>
              <BenefitCard
                icon={<Heart className="h-10 w-10 text-gold mb-4" strokeWidth={1} />}
                title="Shifa Techniques"
                description="Learn specialized techniques to alleviate pain during prayer positions."
              />
            </motion.div>
            <motion.div variants={fadeInUp} transition={{ duration: 0.6 }}>
              <BenefitCard
                icon={<Activity className="h-10 w-10 text-gold mb-4" strokeWidth={1} />}
                title="Mobility Strengthening"
                description="Follow guided exercises to improve flexibility and strength for Salah."
              />
            </motion.div>
            <motion.div variants={fadeInRight} transition={{ duration: 0.6 }} className="sm:col-span-2 md:col-span-1">
              <BenefitCard
                icon={<Users className="h-10 w-10 text-gold mb-4" strokeWidth={1} />}
                title="Personalized Support"
                description="Receive guidance tailored to your specific needs and challenges."
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonials Section with Enhanced Animations */}
      <section
        id="testimonials"
        ref={(el) => {
          sectionsRef.current.testimonials = el;
          return undefined;
        }}
        className="w-full bg-midnight px-4 py-16 md:py-20 overflow-hidden"
      >
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-3"
          >
            <Heart className="h-12 w-12 mx-auto text-gold" strokeWidth={1} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-8 md:mb-12 text-center font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gold tracking-tight leading-tight text-shadow"
          >
            Transformed Lives
          </motion.h2>

          <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <TestimonialCard
                image="/testimonial-1.jpg"
                quote="After years of knee pain during Salah, the techniques I learned through Mobile Muslims have allowed me to pray comfortably again. Alhamdulillah!"
                name="Ahmed A."
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <TestimonialCard
                image="/testimonial-2.jpg"
                quote="The community support and specialized exercises have strengthened my back. I can now complete all five daily prayers without discomfort."
                name="Fatima S."
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Section with Enhanced Animations */}
      <section
        id="cta"
        ref={(el) => {
          sectionsRef.current.cta = el;
          return undefined;
        }}
        className="w-full bg-rich-black px-4 py-16 md:py-20 text-center overflow-hidden"
      >
        <motion.div
          className="mx-auto max-w-4xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-3">
            <Sun className="h-12 w-12 mx-auto text-gold" strokeWidth={1} />
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="mb-6 md:mb-8 font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gold tracking-tight leading-tight text-shadow"
          >
            Begin Your Journey Today
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="mb-8 md:mb-10 text-base sm:text-lg md:text-xl leading-relaxed tracking-wide max-w-3xl mx-auto"
          >
            Join a community dedicated to pain-free prayer and experience the full spiritual benefits of Salah without
            physical limitations.
          </motion.p>

          <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="mb-12">
            <Button
              asChild
              className="bg-gold hover:bg-gold/90 text-black font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-md shadow-lg transform transition-all duration-300 hover:shadow-xl hover:shadow-gold/20 flex items-center mx-auto"
            >
              <Link href="https://buy.stripe.com/eVa4iT2qm3Bt7yU28b">
                <Sun className="h-5 w-5 mr-2" strokeWidth={1.5} />
                Join Now for $1/month
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer with Subtle Animation */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="w-full bg-midnight border-t border-gold/20 px-4 py-6 md:py-8 text-center"
      >
        <div className="flex justify-center items-center mb-4">
          <Heart className="h-6 w-6 text-gold mx-2" strokeWidth={1} />
          <Activity className="h-6 w-6 text-gold mx-2" strokeWidth={1} />
        </div>
        <p className="text-xs sm:text-sm tracking-wide">
          © {new Date().getFullYear()} Mobile Muslims. All rights reserved.
        </p>
      </motion.footer>
    </main>
  )
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-gold/20 bg-midnight p-5 sm:p-6 text-left shadow-lg transition-all duration-300 hover:transform hover:scale-105 hover:border-gold/40 group h-full">
      <div className="flex flex-col items-start">
        {icon}
        <h3 className="mb-3 sm:mb-4 font-serif text-lg sm:text-xl md:text-2xl font-semibold text-gold tracking-tight group-hover:text-gold/90 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-300 text-sm sm:text-base leading-relaxed tracking-wide group-hover:text-white transition-colors duration-300">
          {description}
        </p>
      </div>
    </div>
  )
}

function TestimonialCard({
  image,
  quote,
  name,
}: {
  image?: string
  quote: string
  name: string
}) {
  return (
    <div className="rounded-lg border border-gold/20 bg-rich-black p-5 sm:p-6 text-left shadow-lg transition-all duration-300 hover:border-gold/40 hover:shadow-gold/10 hover:transform hover:scale-[1.02] h-full">
      {image && (
        <div className="relative w-16 h-16 mb-4 rounded-full overflow-hidden border-2 border-gold/30">
          <Image src={image || "/placeholder.svg"} alt={`${name}'s profile`} fill className="object-cover" />
        </div>
      )}
      <p className="mb-4 sm:mb-6 italic text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed tracking-wide">
        "{quote}"
      </p>
      <div className="flex items-center">
        <Heart className="h-4 w-4 text-gold mr-2" strokeWidth={1.5} />
        <p className="font-bold text-gold text-sm sm:text-base tracking-wide">{name}</p>
      </div>
    </div>
  )
}

