//import { Github, Linkedin, Twitter } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="border-t bg-muted/50 py-6">
      <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} . All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer