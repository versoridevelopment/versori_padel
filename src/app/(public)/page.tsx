// src/app/page.tsx
import HeroVideo from "./components/home/HeroVideo";
import MarcasSlider from "./components/home/MarcasSlider";
import TextSlider from "@/app/(public)/components/home/TextSlider";
import SobreNosotros from "@/app/(public)/components/home/SobreNosotros";
import Ubicacion from "@/app/(public)/components/home/Ubicacion";

export default function HomePage() {
  return (
    <main className="bg-transparent text-white min-h-screen overflow-hidden">
      {/* Sección principal con video */}
      <HeroVideo />

      {/* Texto deslizante con el nombre de la marca */}
      <TextSlider text="Versori Pádel" speed={115} />

      <SobreNosotros />

      {/* Slider de marcas */}
      <MarcasSlider />

      <Ubicacion />
    </main>
  );
}
