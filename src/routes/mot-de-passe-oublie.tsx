import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — IziTopUp" },
      {
        name: "description",
        content: "Réinitialise le mot de passe de ton compte IziTopUp en quelques secondes.",
      },
      { property: "og:title", content: "Mot de passe oublié — IziTopUp" },
      { property: "og:description", content: "Reçois un lien de réinitialisation par email." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Mot de passe oublié</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Entre ton email : on t'envoie un lien de réinitialisation.
      </p>

      {sent ? (
        <div className="mt-8 rounded-3xl bg-secondary/70 p-6 text-sm">
          Si un compte existe pour <span className="font-bold">{email}</span>, un email vient
          d'être envoyé. Pense à vérifier tes spams.
        </div>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await api.auth.forgotPassword({ email });
              setSent(true);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Envoi impossible");
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
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-2xl text-base font-bold shadow-accent"
          >
            {loading ? "Envoi…" : "Envoyer le lien"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/connexion" className="font-bold text-primary hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
