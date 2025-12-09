"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import SectionTitle from "../ui/SectionTitle";
import Container from "../ui/Container";

const marcas = [
  "/sponsors/adidas.png",
  "/sponsors/galicia.png",
  "/sponsors/coca_cola.png",
  "/sponsors/wilson.png",
];

export default function MarcasSlider() {
  return (
    <section className="relative min-h-[70vh] flex flex-col justify-center items-center bg-transparent border-t border-neutral-800">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <SectionTitle
            title="Marcas que nos acompañan"
            subtitle="Empresas que confían en nuestra propuesta deportiva, tecnológica y social."
          />
        </motion.div>

        {/* 🧩 Cinta de marcas */}
        <div className="relative mt-16 w-full">
          <motion.div
            className="flex gap-20 items-center"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          >
            {[...marcas, ...marcas].map((src, i) => (
              <Image
                key={i}
                src={src}
                alt="Logo marca"
                width={140}
                height={60}
                className="opacity-75 hover:opacity-100 transition duration-200"
              />
            ))}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
