import {
  Baby,
  Cake,
  Gift,
  GraduationCap,
  Heart,
  Home,
  TreePine,
  type LucideIcon,
} from "lucide-react";
import type { PersonalEventType, RegistryType } from "@/lib/types";

const REGISTRY_ICONS: Record<string, LucideIcon> = {
  baby: Baby,
  birthday: Cake,
  christmas: TreePine,
  wedding: Heart,
  housewarming: Home,
  graduation: GraduationCap,
  other: Gift,
  personal: Gift,
};

export function RegistryIcon({
  registryType,
  eventType,
  className,
}: {
  registryType: RegistryType;
  eventType: PersonalEventType | null;
  className?: string;
}) {
  const Icon =
    REGISTRY_ICONS[registryType === "baby" ? "baby" : eventType || "personal"] || Gift;
  return <Icon className={className} />;
}
