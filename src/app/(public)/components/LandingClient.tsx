"use client";

import Hero from "./home/Hero";
import Nosotros from "./home/Nosotros";
import Profesores from "./home/Profesores";
import Contacto from "./home/Contacto";
import Marcas from "./home/Marcas";

interface ClubData {
  id_club: number;
  nombre: string;
  subdominio: string;
  color_primario: string;
  color_secundario: string;
  color_texto: string;
  logo_url: string | null;
  imagen_hero_url: string | null;
  texto_bienvenida_titulo: string;
  texto_bienvenida_subtitulo: string;
  marcas: any[];
  activo_profesores: boolean; // Recibimos el flag aquí
}

interface Props {
  club: ClubData;
  nosotros: any;
  profesores: any[];
  contacto: any;
}

export default function LandingClient({
  club,
  nosotros,
  profesores,
  contacto,
}: Props) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO */}
      <Hero
        clubData={club}
        titulo={club.texto_bienvenida_titulo}
        subtitulo={club.texto_bienvenida_subtitulo}
      />

      {/* 2. MARCAS */}
      {club.marcas && club.marcas.length > 0 && <Marcas marcas={club.marcas} />}

      {/* 3. NOSOTROS */}
      {nosotros?.activo_nosotros && (
        <Nosotros
          config={nosotros}
          clubColors={{
            primary: club.color_primario,
            secondary: club.color_secundario,
          }}
        />
      )}

      {/* 4. PROFESORES */}
      {/* CONDICIÓN DOBLE: Que existan profesores Y que la sección esté activa */}
      {club.activo_profesores && profesores.length > 0 && (
        <Profesores profesores={profesores} />
      )}

      {/* 5. CONTACTO */}
      {contacto && (
        <Contacto data={contacto} colors={{ primary: club.color_primario }} />
      )}
    </div>
  );
}
