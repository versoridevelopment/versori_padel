import { supabase } from "@/lib/supabase/supabaseClient";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import ContactoForm from "./ContactoForm";

export default async function ContactoPage() {
  const club = await getCurrentClub();

  if (!club) return <div>Error: Club no encontrado.</div>;

  // Hacemos un fetch con JOINs para traer todo junto
  // Nota: Si esto falla porque las relaciones no están definidas en Supabase,
  // tendrás que crear las Foreign Keys en la BD primero.
  const { data: contacto } = await supabase
    .from("contacto")
    .select(
      `
      *,
      direccion (*),
      telefono (*)
    `
    )
    .eq("id_club", club.id_club)
    .single();

  return (
    <ContactoForm
      initialData={contacto} // Puede venir null si es nuevo
      clubId={club.id_club}
      subdominio={club.subdominio}
    />
  );
}
