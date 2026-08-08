import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Support IziTopUp" },
      {
        name: "description",
        content:
          "Une question sur ta commande ou ton paiement ? Contacte le support IziTopUp par WhatsApp, email ou via le formulaire.",
      },
      { property: "og:title", content: "Contacter IziTopUp" },
      {
        property: "og:description",
        content: "Support rapide pour tes recharges de jeux en Haïti.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Contact</h1>
      <p className="mt-3 max-w-lg text-muted-foreground">
        Écris-nous pour toute question sur une commande, un paiement ou ton compte.
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-[1.3fr_1fr]">
        <form
          className="rounded-3xl border border-border p-6 shadow-soft sm:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            toast.success("Message envoyé. Nous te répondons très vite !");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" required className="h-12 rounded-xl" placeholder="Ton nom" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                className="h-12 rounded-xl"
                placeholder="toi@email.com"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              required
              className="h-12 rounded-xl"
              placeholder="Numéro de commande, problème de paiement…"
            />
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              required
              rows={6}
              className="rounded-xl"
              placeholder="Explique-nous en quelques lignes…"
            />
          </div>
          <Button type="submit" className="mt-6 h-12 w-full rounded-2xl font-bold shadow-accent">
            {sent ? "Message envoyé" : "Envoyer le message"}
          </Button>
        </form>

        <div className="space-y-4">
          {[
            {
              icon: MessageCircle,
              title: "WhatsApp",
              value: "+509 0000 0000",
              desc: "Réponse la plus rapide",
            },
            { icon: Mail, title: "Email", value: "support@izitopop.com", desc: "Sous 24 heures" },
            { icon: Phone, title: "Téléphone", value: "+509 0000 0000", desc: "Lun–Sam, 8h–20h" },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl bg-secondary/70 p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <item.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-base font-bold">{item.title}</h2>
              <p className="mt-1 text-sm font-semibold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
