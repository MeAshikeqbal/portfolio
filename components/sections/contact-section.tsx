'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ContactForm } from '../contact-form'
import { ThankYouMessage } from '../thank-you-message'

export function ContactSection() {
  const [isSubmitted, setIsSubmitted] = useState(false)

  return (
    <section id="contact" className="min-h-screen flex items-center bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-8 text-foreground">Get in Touch</h2>
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ContactForm onSuccessfulSubmit={() => setIsSubmitted(true)} />
              </motion.div>
            ) : (
              <ThankYouMessage key="thank-you" />
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}