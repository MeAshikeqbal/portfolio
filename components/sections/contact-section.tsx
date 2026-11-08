"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ContactForm } from "../contact-form"
import { ThankYouMessage } from "../thank-you-message"

export function ContactSection() {
  const [isSubmitted, setIsSubmitted] = useState(false)

  return (
    <section id="Contact" className="flex min-h-screen items-center bg-background py-8">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-center text-4xl font-bold text-foreground">Get in Touch</h2>
        <div className="mx-auto max-w-md">
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
