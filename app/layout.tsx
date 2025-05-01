import '../styles/globals.css'
import { ReactNode } from 'react'
import Image from 'next/image'

export const metadata = {
  title: 'Prompt Insights Dashboard',
  description: 'Token heatmap, carbon footprint, and BPE visualizer'
}

export default function RootLayout({ children, }: { children: ReactNode }) {
  return (
    <html lang="en" className="p-0 m-0">
      <head>
        <link rel="icon" type="image/svg+xml" href="/Favicon/favicon.svg" />
        <link rel="alternate icon" type="image/png" href="/Favicon/favicon-96x96.png" />
        <link rel="apple-touch-icon" href="/Favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/Favicon/site.webmanifest" />
      </head>
      <body className="bg-oled text-gray-100 font-sans min-h-screen p-0 m-0">
        {/* All global neon/gradient backgrounds removed. Only hero blob remains. */}
        <div className="min-h-screen flex flex-col p-0 m-0">
          <main className="flex-1 flex flex-col items-center justify-center bg-transparent relative p-0 m-0">
            {children}
          </main>
          {/* Footer: pill-shaped glass card, centered and organized */}
          <footer className="w-full flex flex-col items-center justify-center pb-12">
            <div className="rounded-3xl bg-[rgba(20,20,40,0.88)] backdrop-blur-3xl shadow-2xl px-10 py-8 flex flex-col items-start gap-4 max-w-lg mx-auto border border-[rgba(162,89,255,0.22)]" style={{boxShadow:'0 4px 48px 0 #a259ff44', WebkitBackdropFilter:'blur(36px)', backdropFilter:'blur(36px)'}}>
              <div className="flex items-center gap-3">
                <img src="/logo.avif" alt="Logo" className="w-8 h-8 rounded-full object-cover object-center" style={{width:'32px',height:'32px'}} />
                <span className="font-semibold text-lg text-white">A product of <span className="text-[#a259ff] font-bold">Hello.World Consulting</span></span>
              </div>
              <div className="text-sm italic text-purple-300">Made by Jonathan Reed</div>
              <div className="flex flex-col gap-2">
                <a href="https://helloworldfirm.com" className="text-[#a259ff] hover:underline font-medium flex items-center gap-2" target="_blank" rel="noopener noreferrer">
                  <img src="/logo.avif" alt="Logo" className="w-5 h-5 rounded-full object-cover object-center" />
                  helloworldfirm.com
                </a>
                <a href="https://JonathanRReed.com" className="text-[#a259ff] hover:underline font-medium flex items-center gap-2" target="_blank" rel="noopener noreferrer">
                  <img src="/jonathan.avif" alt="Jonathan Reed" className="w-5 h-5 rounded-full object-cover object-center border-2 border-[#a259ff]" />
                  JonathanRReed.com
                </a>
              </div>
              <div className="text-xs text-gray-400 mt-2">2025 &copy; All Rights Reserved</div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
