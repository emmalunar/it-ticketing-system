import { cn } from "@/lib/cn";
import { initials } from "@/lib/ticket-meta";

type AvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg";
  tone?: "brand" | "inverse" | "neutral";
  className?: string;
};

export function Avatar({ name, size = "md", tone = "brand", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "avatar",
        size === "sm" && "avatar--sm",
        size === "lg" && "avatar--lg",
        tone === "inverse" && "avatar--inverse",
        tone === "neutral" && "avatar--neutral",
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
