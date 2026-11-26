import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  quiet?: boolean;
  brand?: boolean;
};

export function Card({ quiet, brand, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn("card", quiet && "card--quiet", brand && "card--brand", className)}
    />
  );
}

type CardHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  titleId?: string;
  className?: string;
  children?: ReactNode;
};

export function CardHeader({ title, subtitle, actions, icon, titleId, className, children }: CardHeaderProps) {
  return (
    <div className={cn("card__header", className)}>
      {children ?? (
        <div className="card__title-group">
          {icon ? <span className="card__icon">{icon}</span> : null}
          <div className="card__heading">
            {title ? (
              <h2 className="card-title" id={titleId}>
                {title}
              </h2>
            ) : null}
            {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
          </div>
        </div>
      )}
      {actions ? <div className="card__actions">{actions}</div> : null}
    </div>
  );
}

type CardBodyProps = HTMLAttributes<HTMLDivElement> & {
  flush?: boolean;
  tight?: boolean;
};

export function CardBody({ flush, tight, className, ...props }: CardBodyProps) {
  return (
    <div
      {...props}
      className={cn("card__body", flush && "card__body--flush", tight && "card__body--tight", className)}
    />
  );
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("card__footer", className)} />;
}
