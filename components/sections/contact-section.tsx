import { ContactForm } from '../contact-form'

export function ContactSection() {
  return (
    <section id="contact" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-8 text-foreground">Get in Touch</h2>
        <div className="max-w-md mx-auto">
          <ContactForm />
        </div>
      </div>
    </section>
  )
}

