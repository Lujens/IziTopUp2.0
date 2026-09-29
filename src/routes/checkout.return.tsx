import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { api, unwrapItem } from "@/lib/api";
import type { Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: typeof search["orderId"] === "string" ? (search["orderId"] as string) : undefined,
    transactionId:
      typeof search["transactionId"] === "string" ? (search["transactionId"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Vérification du paiement — IziTopUp" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturnPage,
});

const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 3000;

type VerifyState = "loading" | "success" | "failed" | "timeout" | "missing";

function CheckoutReturnPage() {
  const { orderId } = Route.useSearch();
  const navigate = useNavigate();
  const { isAuthenticated, ready } = useAuth();
  const [state, setState] = useState<VerifyState>(orderId ? "loading" : "missing");
  const [order, setOrder] = useState<Order | null>(null);
  const confettiFired = useRef(false);

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/connexion" });
  }, [ready, isAuthenticated, navigate]);

  useEffect(() => {
    if (!orderId || !ready || !isAuthenticated) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      attempts += 1;
      try {
        const result = await api.payments.verify(orderId);
        if (cancelled) return;

        if (result.payment_status === "failed") {
          setState("failed");
          return;
        }

        if (result.payment_status === "paid" && result.delivery_status === "delivered") {
          const detail = unwrapItem<Order>(await api.orders.detail(orderId), "order");
          if (cancelled) return;
          setOrder(detail);
          setState("success");
          return;
        }
      } catch {
        // Treat a failed check as a missed attempt — keep polling until the cap.
      }

      if (cancelled) return;
      if (attempts >= MAX_ATTEMPTS) {
        setState("timeout");
        return;
      }
      timer = setTimeout(check, POLL_INTERVAL_MS);
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, ready, isAuthenticated]);

  useEffect(() => {
    if (state === "success" && !confettiFired.current) {
      confettiFired.current = true;
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [state]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="rounded-[2rem] border border-border p-6 shadow-soft sm:p-10">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-base font-semibold text-muted-foreground">
              Ap verifye peman ou...
            </p>
          </div>
        )}

        {state === "missing" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-base font-semibold text-muted-foreground">
              Nou pa jwenn enfòmasyon kòmand lan.
            </p>
            <Button asChild className="mt-2 rounded-2xl font-bold shadow-accent">
              <Link to="/">Retounen lakay</Link>
            </Button>
          </div>
        )}

        {state === "failed" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-base font-semibold">Peman echwe — kontakte sipò nou</p>
            <Button asChild className="mt-2 rounded-2xl font-bold shadow-accent">
              <Link to="/">Retounen lakay</Link>
            </Button>
          </div>
        )}

        {state === "timeout" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2 className="h-10 w-10 text-primary" />
            <p className="text-base font-semibold">
              Peman an ap trete — tcheke dashboard ou nan kèk minit
            </p>
            <Button asChild variant="outline" className="mt-2 rounded-2xl font-bold">
              <Link to="/compte">Ale nan dashboard mwen</Link>
            </Button>
          </div>
        )}

        {state === "success" && (
          <>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold sm:text-3xl">Paiement confirmé</h1>
                <p className="truncate text-sm text-muted-foreground">
                  Commande {order?.order_number ?? `#${orderId}`}
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
            </dl>

            {order?.delivered_code && (
              <div className="mt-8 rounded-2xl bg-primary-soft p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-accent-foreground">
                  Ton code
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <code className="min-w-0 flex-1 truncate text-lg font-extrabold">
                    {order.delivered_code}
                  </code>
                  <Button
                    size="sm"
                    className="shrink-0 rounded-xl font-bold"
                    onClick={() => {
                      navigator.clipboard.writeText(String(order.delivered_code));
                      toast.success("Code copié !");
                    }}
                  >
                    <Copy className="mr-1.5 h-4 w-4" /> Copier
                  </Button>
                </div>
              </div>
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
          </>
        )}
      </div>
    </div>
  );
}
