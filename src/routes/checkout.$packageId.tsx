import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Banknote, CreditCard, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api, unwrapItem } from "@/lib/api";
import type { PaymentMethod, Order, Product } from "@/lib/api";
import { formatHTG, formatUSD } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout/$packageId")({
  validateSearch: (search: Record<string, unknown>) => ({
    slug: typeof search["slug"] === "string" ? (search["slug"] as string) : undefined,
    playerId: typeof search["playerId"] === "string" ? (search["playerId"] as string) : undefined,
    coupon: typeof search["coupon"] === "string" ? (search["coupon"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Paiement — IziTopUp" },
      {
        name: "description",
        content: "Finalise ta recharge : MonCash, NatCash, carte bancaire ou portefeuille IziTopUp.",
      },
      { property: "og:title", content: "Paiement sécurisé — IziTopUp" },
      { property: "og:description", content: "Choisis ton moyen de paiement et reçois ton code." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const methods: Array<{ id: PaymentMethod; label: string; desc: string; icon: typeof Wallet }> = [
  { id: "moncash", label: "MonCash", desc: "Paiement mobile Digicel", icon: Smartphone },
  { id: "natcash", label: "NatCash", desc: "Paiement mobile Natcom", icon: Banknote },
  { id: "card", label: "Carte bancaire", desc: "Visa / Mastercard", icon: CreditCard },
  { id: "wallet", label: "Portefeuille IziTopUp", desc: "Utilise ton solde", icon: Wallet },
];

function CheckoutPage() {
  const { packageId } = Route.useParams();
  const { slug, playerId, coupon } = Route.useSearch();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated, ready } = useAuth();
  const [method, setMethod] = useState<PaymentMethod>("moncash");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/connexion" });
  }, [ready, isAuthenticated, navigate]);

  const { data: product } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => unwrapItem<Product>(await api.products.detail(slug as string), "product"),
    enabled: Boolean(slug),
  });

  const pkg = product?.packages?.find((p) => String(p.id) === packageId) ?? null;

  const pay = async () => {
    setLoading(true);
    try {
      const order = (await api.orders.create({
        package_id: packageId,
        payment_method: method,
      })) as Order;
      const orderId = String(order.order_id ?? order.id ?? "");
      if (!orderId) throw new Error("Commande introuvable");

      const payment = await api.payments.initiate({ order_id: orderId });
      if (payment.redirect_url) {
        window.location.href = payment.redirect_url;
        return;
      }
      navigate({ to: "/commande/$id", params: { id: orderId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Paiement impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t("checkout.title")}</h1>

      <section className="mt-8 rounded-3xl border border-border p-6 shadow-soft">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("checkout.summary")}
        </h2>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">
              {String(product?.name ?? "Recharge")}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {pkg ? String(pkg.name ?? pkg.label ?? pkg.amount ?? "Package") : "Package"}
            </p>
            {playerId && (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                ID joueur : {playerId}
              </p>
            )}
            {coupon && (
              <p className="text-xs font-semibold text-primary">Code promo : {coupon}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-extrabold text-primary">{formatUSD(pkg?.price_usd)}</p>
            <p className="text-xs font-semibold text-muted-foreground">
              {formatHTG(pkg?.price_htg)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-extrabold">{t("checkout.method")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {methods.map((m) => {
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                  active
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <m.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{m.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Button
        size="lg"
        disabled={loading}
        onClick={pay}
        className="mt-8 h-14 w-full rounded-2xl text-base font-bold shadow-accent"
      >
        {loading ? "Traitement…" : t("checkout.pay")}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Paiement traité de manière sécurisée. Ton code est livré dès la confirmation.
      </p>
    </div>
  );
}
