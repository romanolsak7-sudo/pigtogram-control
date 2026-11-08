import type { Section } from "./types";

export const navigation: {
  id: Section;
  label: string;
  href: string;
  description: string;
}[] = [
  {
    id: "overview",
    label: "Přehled",
    href: "/",
    description: "Tvůj digitální svět. Na jednom místě.",
  },
  {
    id: "github",
    label: "GitHub",
    href: "/github",
    description: "Projekty, Pull Requesty a každý úspěšný test.",
  },
  {
    id: "supabase",
    label: "Supabase",
    href: "/supabase",
    description: "Přehled projektů a zdraví tvých databází.",
  },
  {
    id: "nas",
    label: "Synology NAS",
    href: "/nas",
    description: "Tvoje data mají svůj domov. Měj o něm přehled.",
  },
  {
    id: "devices",
    label: "Zařízení",
    href: "/devices",
    description: "Místo pro budoucí propojenou domácnost.",
  },
  {
    id: "operator",
    label: "AI operátor",
    href: "/operator",
    description: "Souvislosti, diagnostiky a další dobrý krok.",
  },
];

export function sectionHref(section: Section) {
  return navigation.find((item) => item.id === section)?.href ?? "/";
}
