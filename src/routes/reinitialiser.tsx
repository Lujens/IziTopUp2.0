import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reinitialiser")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? (search["token"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — IziTopUp" },
      {
        name: "description",
        content: "Choisis un nouveau mot de passe pour ton compte IziTopUp.",
      },
      { property: "og:title", content: "Nouveau mot de passe — IziTopUp" },
      { property: "og:description", content: "Définis un nouveau mot de passe sécurisé." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Nouveau mot de passe</h1>

      {!token ? (
        <div className="mt-6 rounded-3xl bg-secondary/70 p-6 text-sm text-muted-foreground">
          Ce lien de réinitialisation est invalide ou incomplet.{" "}
          <Link to="/mot-de-passe-oublie" className="font-bold text-primary hover:underline">
            Demander un nouveau lien
          </Link>
        </div>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await api.auth.resetPassword({ token, password });
              toast.success("Mot de passe mis à jour");
              navigate({ to: "/connexion" });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Réinitialisation impossible");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
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
            {loading ? "Mise à jour…" : "Mettre à jour"}
          </Button>
        </form>
      )}
    </div>
  );
}
