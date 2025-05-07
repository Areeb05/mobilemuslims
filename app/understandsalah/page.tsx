"use client"

import type React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Moon, Sun, Heart, Activity } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";

export default function UnderstandSalah() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useMobile();
  const sectionsRef = useRef<{ [key: string]: HTMLElement | null }>({
    hero: null,
    importance: null,
    components: null,
    cta: null,
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#4B0021] text-white">
      {/* Mobile Navigation */}
      <div className="fixed top-0 left-0 w-full z-50 bg-midnight/80 backdrop-blur-md md:hidden">
        <div className="flex justify-between items-center p-4">
          <div className="text-gold font-serif text-xl font-bold flex items-center">
            Mobile Muslims
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gold p-2 focus:outline-none"
          >
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
                onClick={() => scrollToSection("importance")}
                className="text-left py-2 text-white hover:text-gold transition-colors flex items-center"
              >
                <Heart className="h-4 w-4 mr-2 text-gold" strokeWidth={1.5} />
                Importance
              </button>
              <button
                onClick={() => scrollToSection("components")}
                className="text-left py-2 text-white hover:text-gold transition-colors flex items-center"
              >
                <Activity className="h-4 w-4 mr-2 text-gold" strokeWidth={1.5} />
                Components
              </button>
              <Button
                onClick={() => scrollToSection("cta")}
                className="bg-gold hover:bg-gold/90 text-black font-bold w-full flex items-center justify-center"
              >
                <a href="https://buy.stripe.com/eVa4iT2qm3Bt7yU28b">Join Now</a>
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
            <Link
              href="/"
              className="text-white hover:text-gold transition-colors flex items-center"
            >
              <Moon className="h-4 w-4 mr-2 text-gold/70" strokeWidth={1.5} />
              Home
            </Link>
            <button
              onClick={() => scrollToSection("importance")}
              className="text-white hover:text-gold transition-colors flex items-center"
            >
              <Heart className="h-4 w-4 mr-2 text-gold/70" strokeWidth={1.5} />
              Importance
            </button>
            <button
              onClick={() => scrollToSection("components")}
              className="text-white hover:text-gold transition-colors flex items-center"
            >
              <Activity className="h-4 w-4 mr-2 text-gold/70" strokeWidth={1.5} />
              Components
            </button>
            <Button
              onClick={() => scrollToSection("cta")}
              className="bg-gold hover:bg-gold/90 text-black font-bold flex items-center"
            >
              <a href="https://buy.stripe.com/eVa4iT2qm3Bt7yU28b">Join Now</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
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
            src="/mosque-dawn.jpg"
            alt="Serene mosque at dawn"
            fill
            className="object-cover object-center"
            priority
            quality={100}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#4B0021]/80 via-[#4B0021]/70 to-[#4B0021]/90" />
        </div>

        <div className="z-10 max-w-5xl px-4 sm:px-6 lg:px-8 mt-16 md:mt-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-6 md:mb-8"
          >
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-gold tracking-tight leading-none text-shadow-lg font-elegant">
              Understanding Salah
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            className="mb-8 md:mb-12"
          >
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl tracking-wide leading-relaxed max-w-3xl mx-auto text-white/90">
              Deepen your knowledge of the prayer, its importance, and its components
            </p>
          </motion.div>
        </div>
      </section>

      {/* Importance of Salah */}
      <section
        id="importance"
        ref={(el) => {
          sectionsRef.current.importance = el;
          return undefined;
        }}
        className="relative flex min-h-screen w-full flex-col items-center justify-center bg-rich-black px-4 py-16 md:py-20 text-center overflow-hidden"
      >
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
            <Heart className="h-12 w-12 mx-auto text-gold" strokeWidth={1} />
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="mb-6 md:mb-8 font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gold tracking-tight leading-tight text-shadow"
          >
            Importance of Salah
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="mb-8 md:mb-10 text-base sm:text-lg md:text-xl leading-relaxed tracking-wide max-w-3xl mx-auto"
          >
            Salah, the second pillar of Islam, is the foundation of a Muslim's daily life. It is a direct connection
            between the worshipper and Allah (SWT), offering spiritual nourishment and guidance five times a day.
          </motion.p>
        </motion.div>
      </section>

      {/* Components of Salah */}
      <section
        id="components"
        ref={(el) => {
          sectionsRef.current.components = el;
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
            <Activity className="h-12 w-12 mx-auto text-gold" strokeWidth={1} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-8 md:mb-12 text-center font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gold tracking-tight leading-tight text-shadow"
          >
            Components of Salah
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-base sm:text-lg md:text-xl leading-relaxed tracking-wide text-white/90 text-center"
          >
            <p className="mb-6">Salah consists of specific physical movements and recitations, each with profound meaning:</p>
            <ul className="list-disc list-inside space-y-2 max-w-2xl mx-auto text-left">
              <li><strong>Takbir</strong>: Beginning with "Allahu Akbar" (Allah is the Greatest)</li>
              <li><strong>Qiyam</strong>: Standing position while reciting Surah Al-Fatihah and other verses</li>
              <li><strong>Ruku</strong>: Bowing with hands on knees, glorifying Allah</li>
              <li><strong>Sujood</strong>: Prostration, the position of ultimate humility before Allah</li>
              <li><strong>Tashahhud</strong>: Sitting position reciting salutations upon the Prophet (PBUH)</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
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
            Deepen Your Salah Practice
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="mb-8 md:mb-10 text-base sm:text-lg md:text-xl leading-relaxed tracking-wide max-w-3xl mx-auto"
          >
            Join our community to learn more about perfecting your prayer and overcoming physical challenges during Salah.
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

      {/* Footer */}
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
  );
} 