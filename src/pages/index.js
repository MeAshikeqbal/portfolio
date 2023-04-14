import Head from 'next/head'
import { Header, About, Skills, Blog,Footer } from '@/container'
import { Navbar, Footer_git } from '@/components'


export default function Home() {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Ashik Eqbal's Portfolio" />
        <link rel="icon" href="/favicon.ico" />
        <title>Ashik Eqbal</title>
      </Head>
      <main>
        <Header />
        <About />
        <Skills />
        <Blog />
      </main>
      <footer>
        <Footer/>
        <Footer_git />
      </footer>
    </>
  )
}
