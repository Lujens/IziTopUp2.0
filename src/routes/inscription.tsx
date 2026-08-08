import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/inscription")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search["ref"] === "string" ? (search["ref"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Créer un compte — IziTopUp" },
      {
        name: "description",
        content:
          "Crée ton compte IziTopUp gratuitement : commandes, portefeuille, points et parrainage en un seul endroit.",
      },
      { property: "og:title", content: "Créer un compte IziTopUp" },
      {
        property: "og:description",
        content: "Rejoins IziTopUp et gagne des points sur chaque recharge.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register, isAuthenticated, ready } = useAuth();
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    referral_code: ref ?? "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && isAuthenticated) navigate({ to: "/compte" });
  }, [ready, isAuthenticated, navigate]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Créer un compte</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        30 secondes, et tu peux recharger ton jeu.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            await register({
              ...form,
              referral_code: form.referral_code || undefined,
            });
            toast.success("Bienvenue sur IziTopUp !");
            navigate({ to: "/compte" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Inscription impossible");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">Prénom</Label>
            <Input
              id="first_name"
              required
              value={form.first_name}
              onChange={update("first_name")}
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Nom</Label>
            <Input
              id="last_name"
              required
              value={form.last_name}
              onChange={update("last_name")}
              className="h-12 rounded-xl"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            className="h-12 rounded-xl"
            placeholder="toi@email.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            required
            value={form.phone}
            onChange={update("phone")}
            className="h-12 rounded-xl"
            placeholder="+509 ..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={update("password")}
            className="h-12 rounded-xl"
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referral_code">Code de parrainage (optionnel)</Label>
          <Input
            id="referral_code"
            value={form.referral_code}
            onChange={update("referral_code")}
            className="h-12 rounded-xl"
            placeholder="IZI-XXXX"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-2xl text-base font-bold shadow-accent"
        >
          {loading ? "Création…" : "Créer mon compte"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link to="/connexion" className="font-bold text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
