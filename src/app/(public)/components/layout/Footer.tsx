import Link from "next/link";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-800 text-neutral-400 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* 🔹 Texto / Derechos */}
        <p className="text-sm text-center md:text-left">
          © {new Date().getFullYear()}{" "}
          <span className="text-white font-semibold">VERSORI.</span>. Todos los
          derechos reservados.
        </p>

        {/* 🔹 Enlaces sociales */}
        <div className="flex items-center gap-6 text-white text-2xl">
          {/* WhatsApp */}
          <Link
            href="https://wa.me/5493704770647"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="hover:text-green-500 transition-colors"
          >
            <FaWhatsapp />
          </Link>

          {/* Instagram */}
          <Link
            href="https://www.instagram.com/versoridigital/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:text-pink-500 transition-colors"
          >
            <FaInstagram />
          </Link>
        </div>
      </div>
    </footer>
  );
}
