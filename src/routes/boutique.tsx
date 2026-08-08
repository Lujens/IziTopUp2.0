import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { api, unwrapList } from "@/lib/api";
import type { Product } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { GameCard, GameCardSkeleton } from "@/components/game-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/boutique")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" && search["q"] ? (search["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Boutique — Tous les jeux | IziTopUp" },
      {
        name: "description",
        content:
          "Parcours tous les jeux disponibles sur IziTopUp : Free Fire, PUBG Mobile, Mobile Legends, cartes cadeaux et plus.",
      },
      { property: "og:title", content: "Boutique IziTopUp — Tous les jeux" },
      {
        property: "og:description",
        content: "Trouve ton jeu et recharge en quelques secondes depuis Haïti.",
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { t } = useI18n();
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/boutique" });
  const [category, setCategory] = useState<string>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products"],
    queryFn: async () => unwrapList<Product>(await api.products.list(), "products"),
  });

  const products = useMemo(() => data ?? [], [data]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (typeof p.category === "string" && p.category.trim()) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filtered = products.filter((p) => {
    const matchesCategory = category === "all" || p.category === category;
    const search = (q ?? "").toLowerCase().trim();
    const matchesQuery = !search || String(p.name ?? "").toLowerCase().includes(search);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{t("shop.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("shop.sub")}</p>

      <div className="relative mt-6">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q ?? ""}
          onChange={(e) =>
            navigate({ search: { q: e.target.value || undefined }, replace: true })
          }
          placeholder={t("home.searchPlaceholder")}
          aria-label={t("home.searchPlaceholder")}
          className="h-13 rounded-2xl border-border bg-card pl-11 text-base shadow-soft"
        />
      </div>

      {categories.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {["all", ...categories].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {cat === "all" ? t("shop.all") : cat}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading && Array.from({ length: 8 }).map((_, i) => <GameCardSkeleton key={`s-${i}`} />)}
        {!isLoading &&
          filtered.map((product) => (
            <GameCard key={String(product.id ?? product.slug)} product={product} />
          ))}
      </div>

      {isError && <p className="mt-8 text-sm text-muted-foreground">{t("common.error")}</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{t("shop.empty")}</p>
      )}
    </div>
  );
}
