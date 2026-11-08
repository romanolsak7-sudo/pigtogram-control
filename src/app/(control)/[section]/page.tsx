import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { navigation } from "@/lib/control/navigation";
import {
  GithubSection,
  SupabaseSection,
  NasSection,
  DevicesSection,
  OperatorSection,
} from "@/components/sections";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  return {
    title:
      navigation.find((item) => item.id === section)?.label ?? "Nenalezeno",
  };
}

export default async function SectionPage({ params }: Props) {
  const { section } = await params;
  switch (section) {
    case "github":
      return <GithubSection />;
    case "supabase":
      return <SupabaseSection />;
    case "nas":
      return <NasSection />;
    case "devices":
      return <DevicesSection />;
    case "operator":
      return <OperatorSection />;
    default:
      notFound();
  }
}
