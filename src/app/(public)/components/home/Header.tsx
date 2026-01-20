'use client'

import { useEffect, useState } from 'react'

export default function Header() {
  const [hidden, setHidden] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 80) {
        setHidden(true)
      } else {
        setHidden(false)
      }
      setLastScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <header
      className={`fixed top-0 w-full z-50 bg-white transition-transform duration-300 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      } shadow`}
    >
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <h1 className="font-bold text-xl text-blue-700">VERSORI</h1>
        <nav className="space-x-6 text-sm font-medium">
          <a href="#sedes" className="hover:text-blue-700">Sedes</a>
          <a href="#clases" className="hover:text-blue-700">Clases</a>
          <a href="#eventos" className="hover:text-blue-700">Eventos</a>
          <a href="#nosotros" className="hover:text-blue-700">Nosotros</a>
          <button  className="bg-blue-700 text-white px-4 py-2 rounded-full hover:bg-blue-800">
            Hacé tu reserva
          </button>
        </nav>
      </div>
    </header>
  )
}
