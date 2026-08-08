import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, CreditCard, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { api, unwrapList } from "@/lib/api";
import type { Product } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard, GameCardSkeleton } from "@/components/game-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IziTopUp — Recharge tes jeux en 2 minutes | Haïti" },
      {
        name: "description",
        content:
          "Recharge Free Fire, PUBG Mobile, Mobile Legends et plus depuis Haïti. MonCash, NatCash, carte bancaire. Code livré instantanément.",
      },
      { property: "og:title", content: "IziTopUp — Recharge tes jeux en 2 minutes" },
      {
        property: "og:description",
        content: "Diamants, UC et crédits livrés instantanément. Paiement local sécurisé en Haïti.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products"],
    queryFn: async () => unwrapList<Product>(await api.products.list(), "products"),
  });

  const products = data ?? [];
  const popular = products.slice(0, 8);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary-soft blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {t("home.badge")}
            </span>
            <h1 className="text-balance-tight mt-5 text-5xl font-extrabold leading-[0.95] sm:text-7xl">
              {t("home.title1")}
              <br />
              <span className="text-primary">{t("home.title2")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              {t("home.sub")}
            </p>

            <form
              className="mt-7 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/boutique", search: { q: query || undefined } });
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className="h-14 rounded-2xl border-border bg-card pl-11 text-base shadow-soft"
                  aria-label={t("home.searchPlaceholder")}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-14 rounded-2xl px-7 text-base font-bold shadow-accent"
              >
                {t("home.cta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Livraison instantanée
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Paiement sécurisé
              </span>
              <span className="inline-flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> MonCash · NatCash · Carte
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.popular")}</h2>
          <Link
            to="/boutique"
            className="shrink-0 text-sm font-bold text-primary hover:underline"
            search={{ q: undefined }}
          >
            {t("home.seeAll")}
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => <GameCardSkeleton key={`sk-${i}`} />)}
          {!isLoading &&
            popular.map((product) => (
              <GameCard key={String(product.id ?? product.slug)} product={product} />
            ))}
        </div>
        {isError && <p className="mt-6 text-sm text-muted-foreground">{t("common.error")}</p>}
        {!isLoading && !isError && popular.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">{t("shop.empty")}</p>
        )}
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <div className="rounded-[2rem] bg-secondary/70 p-6 sm:p-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.how")}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", title: t("home.step1"), desc: t("home.step1d") },
              { n: "02", title: t("home.step2"), desc: t("home.step2d") },
              { n: "03", title: t("home.step3"), desc: t("home.step3d") },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl bg-card p-6 shadow-soft">
                <span className="text-sm font-black text-primary">{step.n}</span>
                <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-6 rounded-[2rem] border border-border p-6 sm:p-10 md:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Gagne des points à chaque recharge
            </h2>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
              Parraine tes amis, accumule des points et convertis-les en crédit dans ton
              portefeuille IziTopUp.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Button asChild size="lg" className="h-13 rounded-2xl px-7 font-bold shadow-accent">
              <Link to="/inscription">Créer mon compte</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <div className="rounded-[2rem] bg-foreground px-6 py-10 text-background sm:px-12">
          <h2 className="text-2xl font-extrabold text-background sm:text-3xl">
            Des questions avant de recharger&nbsp;?
          </h2>
          <p className="mt-3 max-w-lg text-sm opacity-80">
            Consulte la FAQ ou écris-nous — on répond vite.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary" className="rounded-2xl font-bold">
              <Link to="/faq">Voir la FAQ</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-2xl border-background/30 bg-transparent font-bold text-background hover:bg-background/10 hover:text-background"
            >
              <Link to="/contact">Nous contacter</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
