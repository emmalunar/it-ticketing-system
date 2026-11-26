import Image from "next/image";
import { cn } from "@/lib/cn";

export function Brand({
  inverse = false,
  large = false,
  showText = true,
  caption = "OmniGroup IT",
  className,
}: {
  inverse?: boolean;
  large?: boolean;
  showText?: boolean;
  caption?: string;
  className?: string;
}) {
  return (
    <span className={cn("brand", inverse && "brand--inverse", large && "brand--lg", className)}>
      <span className="brand__mark">
        <Image
          src="/omni.jpg"
          alt="The OmniGroup"
          width={92}
          height={46}
          sizes={large ? "46px" : "38px"}
          priority
        />
      </span>
      {showText ? (
        <span className="brand__text">
          <span className="brand__name">Service Desk</span>
          <span className="brand__caption">{caption}</span>
        </span>
      ) : null}
    </span>
  );
}
