import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { api, unwrapItem } from "@/lib/api";
import type { Package, Product } from "@/lib/api";
import { formatHTG, formatUSD } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jeu/$slug")({
  head: ({ params }) => {
    const pretty = params.slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `Recharge ${pretty} — IziTopUp` },
        {
          name: "description",
          content: `Recharge ${pretty} depuis Haïti en quelques secondes. Paiement MonCash, NatCash ou carte, code livré instantanément.`,
        },
        { property: "og:title", content: `Recharge ${pretty} — IziTopUp` },
        {
          property: "og:description",
          content: `Choisis ton package ${pretty} et reçois ton code instantanément.`,
        },
      ],
    };
  },
  component: ProductPage,
});

function packageLabel(pkg: Package): string {
  return String(pkg.name ?? pkg.label ?? pkg.amount ?? `Package ${pkg.id}`);
}

function ProductPage() {
  const { slug } = Route.useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated, ready } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<"idle" | "valid" | "invalid">("idle");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => unwrapItem<Product>(await api.products.detail(slug), "product"),
  });

  const product = data ?? null;
  const packages = product?.packages ?? [];
  const activePackage = packages.find((p) => String(p.id) === selected) ?? null;

  const image =
    typeof product?.image_url === "string"
      ? product.image_url
      : typeof product?.image === "string"
        ? product.image
        : undefined;

  const imageSrc = image
    ? image.startsWith("http")
      ? image
      : `https://izitopop.com/${image.replace(/^\//, "")}`
    : undefined;

  const onContinue = () => {
    if (!activePackage) return;
    if (ready && !isAuthenticated) {
      toast.info("Connecte-toi pour finaliser ta commande");
      navigate({ to: "/connexion" });
      return;
    }
    navigate({
      to: "/checkout/$packageId",
      params: { packageId: String(activePackage.id) },
      search: { slug, playerId: playerId || undefined, coupon: coupon || undefined },
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32 sm:px-6 sm:py-12 sm:pb-16">
      <Link
        to="/boutique"
        search={{ q: undefined }}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("shop.title")}
      </Link>

      {isLoading && <div className="mt-8 h-64 animate-pulse rounded-3xl bg-muted" />}
      {isError && <p className="mt-8 text-sm text-muted-foreground">{t("common.error")}</p>}

      {product && (
        <>
          <div className="mt-6 grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center">
            <div className="aspect-square w-full overflow-hidden rounded-3xl bg-primary-soft sm:w-[200px]">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={String(product.name ?? slug)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-5xl font-black text-primary">
                  {String(product.name ?? slug).charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
                <Zap className="h-3.5 w-3.5" /> Livraison instantanée
              </span>
              <h1 className="text-balance-tight mt-3 text-4xl font-extrabold sm:text-5xl">
                {String(product.name ?? slug)}
              </h1>
              {product.description && (
                <p className="mt-3 text-sm text-muted-foreground">{String(product.description)}</p>
              )}
            </div>
          </div>

          <section className="mt-10">
            <h2 className="text-xl font-extrabold">{t("product.packages")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => {
                const active = String(pkg.id) === selected;
                return (
                  <button
                    key={String(pkg.id)}
                    type="button"
                    onClick={() => setSelected(String(pkg.id))}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all",
                      active
                        ? "border-primary bg-primary-soft shadow-accent"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{packageLabel(pkg)}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {formatHTG(pkg.price_htg)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-extrabold text-primary">
                        {formatUSD(pkg.price_usd)}
                      </p>
                      {active && (
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {packages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun package disponible pour le moment.
                </p>
              )}
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="playerId">{t("product.playerId")}</Label>
              <Input
                id="playerId"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Ex : 1234567890"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon">{t("product.coupon")}</Label>
              <div className="flex gap-2">
                <Input
                  id="coupon"
                  value={coupon}
                  onChange={(e) => {
                    setCoupon(e.target.value);
                    setCouponState("idle");
                  }}
                  placeholder="IZI10"
                  className="h-12 rounded-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 shrink-0 rounded-xl font-bold"
                  onClick={async () => {
                    if (!coupon || !product.id) return;
                    try {
                      await api.referrals.validateCoupon(coupon, product.id);
                      setCouponState("valid");
                      toast.success("Code promo appliqué");
                    } catch (err) {
                      setCouponState("invalid");
                      toast.error(err instanceof Error ? err.message : "Code invalide");
                    }
                  }}
                >
                  {t("product.apply")}
                </Button>
              </div>
              {couponState === "valid" && (
                <p className="text-xs font-semibold text-success">Code valide</p>
              )}
              {couponState === "invalid" && (
                <p className="text-xs font-semibold text-destructive">Code invalide</p>
              )}
            </div>
          </section>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="mx-auto flex max-w-5xl items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {activePackage ? packageLabel(activePackage) : "Sélectionne un package"}
                </p>
                <p className="text-xl font-extrabold">
                  {activePackage ? formatUSD(activePackage.price_usd) : "—"}
                </p>
              </div>
              <Button
                size="lg"
                disabled={!activePackage}
                onClick={onContinue}
                className="h-13 shrink-0 rounded-2xl px-8 font-bold shadow-accent"
              >
                {t("product.continue")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
