import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — IziTopUp" },
      {
        name: "description",
        content: "Connecte-toi à ton compte IziTopUp pour voir tes commandes, ton portefeuille et tes points.",
      },
      { property: "og:title", content: "Connexion IziTopUp" },
      { property: "og:description", content: "Accède à ton compte IziTopUp." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated, ready } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && isAuthenticated) navigate({ to: "/compte" });
  }, [ready, isAuthenticated, navigate]);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Bon retour 👋</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Connecte-toi pour recharger en un clic.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            await login(email, password);
            toast.success("Connexion réussie");
            navigate({ to: "/compte" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Connexion impossible");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl"
            placeholder="toi@email.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              to="/mot-de-passe-oublie"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl"
            placeholder="••••••••"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-2xl text-base font-bold shadow-accent"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link to="/inscription" className="font-bold text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
