import { Html, Head, Main, NextScript } from 'next/document'
import {Footer_git, Navbar} from '@/components'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
        <nav>
          <Navbar />
        </nav>
      <body>
        <Main />
        <NextScript />
      </body>
      <footer>
        <Footer_git/>
      </footer>
    </Html>
  )
}
