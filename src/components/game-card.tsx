import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/api";

function imageOf(product: Product): string | undefined {
  const candidate = product.image_url || product.image || (product["icon"] as string | undefined);
  if (!candidate || typeof candidate !== "string") return undefined;
  if (candidate.startsWith("http")) return candidate;
  return `https://izitopop.com/${candidate.replace(/^\//, "")}`;
}

export function GameCard({ product }: { product: Product }) {
  const src = imageOf(product);
  const name = product.name ?? "Jeu";
  const slug = String(product.slug ?? product.id ?? "");
  const packagesCount = product.packages?.length ?? 0;

  return (
    <Link
      to="/jeu/$slug"
      params={{ slug }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-primary-soft">
        {src ? (
          <img
            src={src}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-soft to-secondary text-4xl font-black text-primary">
            {name.charAt(0)}
          </div>
        )}
        <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/90 opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <h3 className="truncate text-base font-bold">{name}</h3>
        <p className="text-xs font-medium text-muted-foreground">
          {packagesCount > 0 ? `${packagesCount} packages` : "Recharge instantanée"}
        </p>
      </div>
    </Link>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
