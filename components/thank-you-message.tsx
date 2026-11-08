import { motion } from "motion/react"

export function ThankYouMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <h3 className="mb-4 text-2xl font-bold text-foreground">Thank You!</h3>
      <p className="text-muted-foreground">
        We&apos;ve received your message and will get back to you soon.
      </p>
    </motion.div>
  )
}
