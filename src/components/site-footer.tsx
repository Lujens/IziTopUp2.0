import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="min-w-0">
            <img src="/IziTopUp-logo.png" alt="IziTopUp" className="h-14 w-auto" />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              La façon la plus simple de recharger tes jeux en Haïti. Paiement MonCash, NatCash,
              carte bancaire ou portefeuille. Livraison instantanée.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold">Navigation</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/boutique" className="hover:text-foreground">
                  Boutique
                </Link>
              </li>
              <li>
                <Link to="/compte" className="hover:text-foreground">
                  Mon compte
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold">Paiement</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>MonCash</li>
              <li>NatCash</li>
              <li>Carte bancaire</li>
              <li>Portefeuille IziTopUp</li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} IziTopUp. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
