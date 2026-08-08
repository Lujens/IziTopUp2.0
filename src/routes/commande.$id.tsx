import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { CheckCircle2, Clock, Copy, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, unwrapItem } from "@/lib/api";
import type { Order } from "@/lib/api";
import { formatDate, formatHTG, formatUSD } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/commande/$id")({
  head: () => ({
    meta: [
      { title: "Ma commande — IziTopUp" },
      {
        name: "description",
        content: "Suis le statut de ta commande IziTopUp et récupère ton code de recharge.",
      },
      { property: "og:title", content: "Ma commande — IziTopUp" },
      { property: "og:description", content: "Statut de paiement et code de recharge." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function statusTone(status?: string) {
  const value = (status ?? "").toLowerCase();
  if (["paid", "completed", "success", "delivered"].includes(value)) return "success";
  if (["failed", "cancelled", "canceled", "error"].includes(value)) return "failed";
  return "pending";
}

function OrderPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated, ready } = useAuth();

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/connexion" });
  }, [ready, isAuthenticated, navigate]);

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: async () => unwrapItem<Order>(await api.orders.detail(id), "order"),
    enabled: ready && isAuthenticated,
    refetchInterval: (query) => {
      const order = query.state.data as Order | null;
      return order?.delivered_code ? false : 5000;
    },
  });

  const verifyQuery = useQuery({
    queryKey: ["payment-verify", id],
    queryFn: () => api.payments.verify(id),
    enabled: ready && isAuthenticated,
    refetchInterval: (query) => {
      const data = query.state.data as { payment_status?: string } | undefined;
      return statusTone(data?.payment_status) === "pending" ? 5000 : false;
    },
  });

  const order = orderQuery.data ?? null;
  const paymentStatus = verifyQuery.data?.payment_status ?? order?.payment_status;
  const tone = statusTone(paymentStatus);
  const code = order?.delivered_code;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="rounded-[2rem] border border-border p-6 shadow-soft sm:p-10">
        <div className="flex items-center gap-3">
          {tone === "success" && <CheckCircle2 className="h-8 w-8 text-success" />}
          {tone === "failed" && <XCircle className="h-8 w-8 text-destructive" />}
          {tone === "pending" && <Clock className="h-8 w-8 animate-pulse text-primary" />}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold sm:text-3xl">
              {tone === "success"
                ? "Paiement confirmé"
                : tone === "failed"
                  ? "Paiement échoué"
                  : "Paiement en cours"}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              Commande {order?.order_number ?? `#${id}`}
            </p>
          </div>
        </div>

        <dl className="mt-8 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Produit</dt>
            <dd className="truncate font-semibold">{order?.product_name ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Package</dt>
            <dd className="truncate font-semibold">{order?.package_name ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Montant</dt>
            <dd className="font-semibold">
              {formatUSD(order?.price_usd)} · {formatHTG(order?.price_htg)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Méthode</dt>
            <dd className="font-semibold uppercase">{order?.payment_method ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-semibold">{formatDate(order?.created_at)}</dd>
          </div>
        </dl>

        {code ? (
          <div className="mt-8 rounded-2xl bg-primary-soft p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-accent-foreground">
              Ton code
            </p>
            <div className="mt-2 flex items-center gap-3">
              <code className="min-w-0 flex-1 truncate text-lg font-extrabold">{code}</code>
              <Button
                size="sm"
                className="shrink-0 rounded-xl font-bold"
                onClick={() => {
                  navigator.clipboard.writeText(String(code));
                  toast.success("Code copié !");
                }}
              >
                <Copy className="mr-1.5 h-4 w-4" /> Copier
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-8 rounded-2xl bg-secondary/70 p-5 text-sm text-muted-foreground">
            {tone === "failed"
              ? "Le paiement n'a pas abouti. Tu peux réessayer depuis la boutique."
              : "Ton code apparaîtra ici dès la confirmation du paiement. Cette page se met à jour automatiquement."}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-2xl font-bold">
            <Link to="/compte">Mes commandes</Link>
          </Button>
          <Button asChild className="rounded-2xl font-bold shadow-accent">
            <Link to="/boutique" search={{ q: undefined }}>
              Recharger encore
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
