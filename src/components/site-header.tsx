import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, User, Wallet, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex shrink-0 items-center rounded-full bg-muted p-0.5 text-xs font-semibold">
      {(["fr", "ht"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={cn(
            "rounded-full px-2.5 py-1 uppercase transition-colors",
            lang === code ? "bg-background text-foreground shadow-soft" : "text-muted-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const { isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: "/boutique", label: t("nav.shop") },
    { to: "/faq", label: t("nav.faq") },
    { to: "/contact", label: t("nav.contact") },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img
              src="/IziTopUp-favicon.png"
              alt="IziTopUp"
              className="h-8 w-8 shrink-0 object-contain"
            />
            <span className="truncate text-lg font-extrabold tracking-tight">IziTopUp</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "text-foreground bg-muted" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <LangToggle />
          </div>
          {isAuthenticated ? (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm" className="rounded-full font-semibold">
                <Link to="/compte">
                  <Wallet className="mr-1.5 h-4 w-4" />
                  {t("nav.account")}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full font-semibold"
                onClick={async () => {
                  await logout();
                  navigate({ to: "/" });
                }}
              >
                {t("nav.logout")}
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm" className="rounded-full font-semibold">
                <Link to="/connexion">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full font-semibold shadow-accent">
                <Link to="/inscription">{t("nav.register")}</Link>
              </Button>
            </div>
          )}
          <button
            type="button"
            aria-label="Menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-semibold text-foreground hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link
                  to="/compte"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-semibold hover:bg-muted"
                >
                  {t("nav.account")}
                </Link>
                <button
                  type="button"
                  className="rounded-xl px-3 py-3 text-left text-base font-semibold text-destructive hover:bg-muted"
                  onClick={async () => {
                    setOpen(false);
                    await logout();
                    navigate({ to: "/" });
                  }}
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                <Button asChild variant="outline" className="rounded-xl font-semibold">
                  <Link to="/connexion" onClick={() => setOpen(false)}>
                    <User className="mr-2 h-4 w-4" />
                    {t("nav.login")}
                  </Link>
                </Button>
                <Button asChild className="rounded-xl font-semibold">
                  <Link to="/inscription" onClick={() => setOpen(false)}>
                    {t("nav.register")}
                  </Link>
                </Button>
              </div>
            )}
            <div className="mt-3">
              <LangToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
