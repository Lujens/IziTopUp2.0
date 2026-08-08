import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Gift, ShoppingBag, Sparkles, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { api, unwrapList } from "@/lib/api";
import type { Order, ReferralStats, Wallet, WalletTransaction } from "@/lib/api";
import { formatDate, formatHTG, formatUSD, initialsOf, toNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/compte")({
  head: () => ({
    meta: [
      { title: "Mon compte — Commandes, portefeuille et points | IziTopUp" },
      {
        name: "description",
        content:
          "Gère tes commandes, ton solde, tes points et ton parrainage IziTopUp depuis un seul tableau de bord.",
      },
      { property: "og:title", content: "Mon compte IziTopUp" },
      {
        property: "og:description",
        content: "Commandes, portefeuille, points et parrainage en un coup d'œil.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof WalletIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AccountPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, isAuthenticated, ready, setUser } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/connexion" });
  }, [ready, isAuthenticated, navigate]);

  const enabled = ready && isAuthenticated;

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: async () => unwrapList<Order>(await api.orders.list(), "orders"),
    enabled,
  });

  const statsQuery = useQuery({
    queryKey: ["referral-stats"],
    queryFn: () => api.referrals.stats(),
    enabled,
  });

  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.referrals.wallet(),
    enabled,
  });

  const orders = ordersQuery.data ?? [];
  const stats: ReferralStats = statsQuery.data ?? {};
  const wallet: Wallet = walletQuery.data ?? {};

  const [profile, setProfile] = useState({ first_name: "", last_name: "", phone: "" });
  useEffect(() => {
    if (user) {
      setProfile({
        first_name: String(user.first_name ?? ""),
        last_name: String(user.last_name ?? ""),
        phone: String(user.phone ?? ""),
      });
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: () => api.referrals.updateProfile(profile),
    onSuccess: (data) => {
      toast.success("Profil mis à jour");
      if (data && typeof data === "object") setUser({ ...user, ...data });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Mise à jour impossible"),
  });

  const [redeem, setRedeem] = useState("");
  const redeemPoints = useMutation({
    mutationFn: () => api.referrals.redeemPoints({ points: Number(redeem) }),
    onSuccess: () => {
      toast.success("Points convertis en crédit");
      setRedeem("");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["referral-stats"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Conversion impossible"),
  });

  const balance = wallet.balance ?? stats.wallet_balance ?? user?.wallet_balance ?? 0;
  const points = wallet.points ?? stats.points ?? user?.points ?? 0;
  const referralLink =
    stats.referral_link ??
    (stats.referral_code
      ? `https://izitopop.com/inscription?ref=${stats.referral_code}`
      : undefined);

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(t("common.copied"));
  };

  if (!ready) {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-base font-black text-primary-foreground">
            {initialsOf(user?.first_name, user?.last_name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold sm:text-3xl">
              {user?.first_name ? `Salut, ${user.first_name}` : t("account.title")}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
          </div>
        </div>
        <Button asChild className="shrink-0 rounded-2xl font-bold shadow-accent">
          <Link to="/boutique" search={{ q: undefined }}>
            Recharger
          </Link>
        </Button>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={WalletIcon}
          label={t("account.balance")}
          value={formatHTG(balance)}
          hint="Portefeuille IziTopUp"
        />
        <StatCard
          icon={Sparkles}
          label={t("account.points")}
          value={String(toNumber(points))}
          hint="Convertibles en crédit"
        />
        <StatCard
          icon={ShoppingBag}
          label={t("account.orders")}
          value={String(orders.length)}
          hint="Commandes au total"
        />
      </div>

      <Tabs defaultValue="orders" className="mt-10">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-muted p-1">
          <TabsTrigger value="orders" className="rounded-xl font-semibold">
            {t("account.orders")}
          </TabsTrigger>
          <TabsTrigger value="wallet" className="rounded-xl font-semibold">
            {t("account.wallet")}
          </TabsTrigger>
          <TabsTrigger value="referrals" className="rounded-xl font-semibold">
            {t("account.referrals")}
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-xl font-semibold">
            {t("account.profile")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          {ordersQuery.isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          {!ordersQuery.isLoading && orders.length === 0 && (
            <div className="rounded-3xl bg-secondary/70 p-8 text-center">
              <p className="font-bold">Aucune commande pour l'instant</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ta première recharge t'attend dans la boutique.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {orders.map((order) => {
              const orderId = String(order.id ?? order.order_id ?? "");
              return (
                <Link
                  key={orderId || order.order_number}
                  to="/commande/$id"
                  params={{ id: orderId }}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {order.product_name ?? "Recharge"} · {order.package_name ?? ""}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {order.order_number ?? `#${orderId}`} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-extrabold">{formatUSD(order.price_usd)}</p>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {order.payment_status ?? order.status ?? "—"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="wallet" className="mt-6 space-y-6">
          <div className="rounded-3xl bg-foreground p-6 text-background sm:p-8">
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">
              {t("account.balance")}
            </p>
            <p className="mt-2 text-4xl font-extrabold">{formatHTG(balance)}</p>
            <p className="mt-1 text-sm opacity-70">{toNumber(points)} points disponibles</p>
          </div>

          <div className="rounded-3xl border border-border p-6">
            <h2 className="text-base font-bold">Convertir mes points</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                type="number"
                min={1}
                value={redeem}
                onChange={(e) => setRedeem(e.target.value)}
                placeholder="Nombre de points"
                className="h-12 rounded-xl"
              />
              <Button
                className="h-12 shrink-0 rounded-xl font-bold"
                disabled={!redeem || redeemPoints.isPending}
                onClick={() => redeemPoints.mutate()}
              >
                {redeemPoints.isPending ? "…" : "Convertir"}
              </Button>
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold">Transactions</h2>
            <div className="mt-3 space-y-2">
              {(wallet.transactions ?? []).map((tx: WalletTransaction, i) => (
                <div
                  key={String(tx.id ?? i)}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {tx.description ?? tx.type ?? "Transaction"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                  </div>
                  <p className="shrink-0 font-extrabold">{formatHTG(tx.amount)}</p>
                </div>
              ))}
              {(wallet.transactions ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune transaction.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="mt-6 space-y-6">
          <div className="rounded-3xl border border-border p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Gift className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-extrabold">Invite tes amis, gagne des points</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chaque ami qui recharge avec ton code te rapporte des points.
            </p>

            {stats.referral_code && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-secondary/70 p-4">
                <code className="min-w-0 flex-1 truncate text-base font-extrabold">
                  {stats.referral_code}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-xl font-bold"
                  onClick={() => copy(String(stats.referral_code))}
                >
                  <Copy className="mr-1.5 h-4 w-4" /> {t("common.copy")}
                </Button>
              </div>
            )}

            {referralLink && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-secondary/70 p-4">
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {referralLink}
                </span>
                <Button
                  size="sm"
                  className="shrink-0 rounded-xl font-bold"
                  onClick={() => copy(referralLink)}
                >
                  <Copy className="mr-1.5 h-4 w-4" /> {t("common.copy")}
                </Button>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-bold">Mes filleuls</h2>
            <div className="mt-3 space-y-2">
              {(stats.referrals ?? []).map((r, i) => {
                const item = r as Record<string, unknown>;
                return (
                  <div
                    key={String(item["id"] ?? i)}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"
                  >
                    <p className="truncate text-sm font-semibold">
                      {String(item["first_name"] ?? item["name"] ?? item["email"] ?? "Filleul")}
                    </p>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(item["created_at"])}
                    </p>
                  </div>
                );
              })}
              {(stats.referrals ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun filleul pour l'instant.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <form
            className="max-w-lg space-y-4 rounded-3xl border border-border p-6"
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="h-12 rounded-2xl font-bold shadow-accent"
            >
              {updateProfile.isPending ? "…" : "Enregistrer"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
