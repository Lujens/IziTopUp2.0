import { createFileRoute, Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Questions fréquentes | IziTopUp" },
      {
        name: "description",
        content:
          "Délais de livraison, moyens de paiement, points et parrainage : toutes les réponses sur les recharges IziTopUp en Haïti.",
      },
      { property: "og:title", content: "FAQ IziTopUp" },
      {
        property: "og:description",
        content: "Réponses aux questions fréquentes sur les recharges, paiements et livraisons.",
      },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    q: "Combien de temps prend la livraison ?",
    a: "La plupart des commandes sont livrées automatiquement en moins de 2 minutes après confirmation du paiement. En cas de forte demande, cela peut prendre jusqu'à 15 minutes.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "MonCash, NatCash, carte bancaire (Visa / Mastercard) et le solde de ton portefeuille IziTopUp.",
  },
  {
    q: "Où est-ce que je retrouve mon code ?",
    a: "Dans ton compte, section Commandes. Le code apparaît dès que la livraison est confirmée, avec un bouton pour le copier.",
  },
  {
    q: "Comment fonctionnent les points ?",
    a: "Tu gagnes des points sur tes achats et sur chaque ami parrainé. Tes points se convertissent en crédit dans ton portefeuille depuis la section Parrainage.",
  },
  {
    q: "Comment marche le parrainage ?",
    a: "Partage ton lien de parrainage unique. Quand un ami crée un compte avec ton code et effectue sa première recharge, tu reçois des points.",
  },
  {
    q: "Mon paiement a été débité mais je n'ai pas reçu mon code.",
    a: "Ouvre la commande concernée dans ton compte : le statut se met à jour automatiquement. Si le problème persiste après 30 minutes, contacte-nous avec ton numéro de commande.",
  },
];

function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Questions fréquentes</h1>
      <p className="mt-3 text-muted-foreground">
        Tout ce qu'il faut savoir avant de recharger ton jeu.
      </p>

      <Accordion type="single" collapsible className="mt-8">
        {faqs.map((item) => (
          <AccordionItem key={item.q} value={item.q} className="border-border">
            <AccordionTrigger className="text-left text-base font-bold hover:no-underline">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-10 rounded-3xl bg-secondary/70 p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">Tu ne trouves pas ta réponse ?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Notre équipe répond en général en moins d'une heure.
        </p>
        <Button asChild className="mt-5 rounded-2xl font-bold shadow-accent">
          <Link to="/contact">Nous contacter</Link>
        </Button>
      </div>
    </div>
  );
}
