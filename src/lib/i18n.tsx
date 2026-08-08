import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "fr" | "ht";

const LANG_KEY = "izitopop_lang";

const dict = {
  "nav.shop": { fr: "Boutique", ht: "Boutik" },
  "nav.faq": { fr: "FAQ", ht: "Kesyon" },
  "nav.contact": { fr: "Contact", ht: "Kontak" },
  "nav.account": { fr: "Mon compte", ht: "Kont mwen" },
  "nav.login": { fr: "Connexion", ht: "Konekte" },
  "nav.register": { fr: "Créer un compte", ht: "Kreye yon kont" },
  "nav.logout": { fr: "Déconnexion", ht: "Dekonekte" },

  "home.badge": { fr: "Recharge instantanée en Haïti", ht: "Rechaj rapid ann Ayiti" },
  "home.title1": { fr: "Recharge ton jeu", ht: "Rechaje jwèt ou" },
  "home.title2": { fr: "en 2 minutes.", ht: "an 2 minit." },
  "home.sub": {
    fr: "Diamants, UC, crédits et cartes cadeaux — payés en MonCash, NatCash ou par carte. Code livré instantanément.",
    ht: "Dyaman, UC, kredi ak kat kado — peye ak MonCash, NatCash oswa kat. Kòd la rive lamenm.",
  },
  "home.searchPlaceholder": { fr: "Cherche un jeu…", ht: "Chèche yon jwèt…" },
  "home.cta": { fr: "Voir la boutique", ht: "Gade boutik la" },
  "home.popular": { fr: "Jeux populaires", ht: "Jwèt popilè" },
  "home.seeAll": { fr: "Tout voir", ht: "Wè tout" },
  "home.how": { fr: "Comment ça marche", ht: "Kijan sa mache" },
  "home.step1": { fr: "Choisis ton jeu", ht: "Chwazi jwèt ou" },
  "home.step1d": {
    fr: "Sélectionne le jeu et le package qui te convient.",
    ht: "Chwazi jwèt la ak pake ki bon pou ou.",
  },
  "home.step2": { fr: "Paye en toute sécurité", ht: "Peye an sekirite" },
  "home.step2d": {
    fr: "MonCash, NatCash, carte bancaire ou ton portefeuille IziTopUp.",
    ht: "MonCash, NatCash, kat bankè oswa bous IziTopUp ou.",
  },
  "home.step3": { fr: "Reçois ton code", ht: "Resevwa kòd ou" },
  "home.step3d": {
    fr: "Le code arrive dans ton compte, prêt à être utilisé.",
    ht: "Kòd la rive nan kont ou, pare pou itilize.",
  },

  "shop.title": { fr: "Boutique", ht: "Boutik" },
  "shop.sub": {
    fr: "Tous les jeux et recharges disponibles.",
    ht: "Tout jwèt ak rechaj ki disponib.",
  },
  "shop.all": { fr: "Tous", ht: "Tout" },
  "shop.empty": { fr: "Aucun jeu trouvé.", ht: "Nou pa jwenn okenn jwèt." },

  "product.packages": { fr: "Choisis ton package", ht: "Chwazi pake ou" },
  "product.playerId": { fr: "ID joueur", ht: "ID jwè" },
  "product.coupon": { fr: "Code promo", ht: "Kòd pwomo" },
  "product.apply": { fr: "Appliquer", ht: "Aplike" },
  "product.continue": { fr: "Continuer", ht: "Kontinye" },

  "checkout.title": { fr: "Paiement", ht: "Peman" },
  "checkout.method": { fr: "Méthode de paiement", ht: "Metòd peman" },
  "checkout.pay": { fr: "Payer maintenant", ht: "Peye kounye a" },
  "checkout.summary": { fr: "Résumé de la commande", ht: "Rezime kòmand lan" },

  "account.title": { fr: "Mon compte", ht: "Kont mwen" },
  "account.overview": { fr: "Aperçu", ht: "Apèsi" },
  "account.orders": { fr: "Commandes", ht: "Kòmand" },
  "account.wallet": { fr: "Portefeuille", ht: "Bous" },
  "account.referrals": { fr: "Parrainage", ht: "Referans" },
  "account.profile": { fr: "Profil", ht: "Pwofil" },
  "account.points": { fr: "Points", ht: "Pwen" },
  "account.balance": { fr: "Solde", ht: "Balans" },

  "common.loading": { fr: "Chargement…", ht: "Y ap chaje…" },
  "common.error": { fr: "Une erreur est survenue.", ht: "Gen yon erè ki fèt." },
  "common.retry": { fr: "Réessayer", ht: "Eseye ankò" },
  "common.copy": { fr: "Copier", ht: "Kopye" },
  "common.copied": { fr: "Copié !", ht: "Kopye !" },
} as const;

export type TranslationKey = keyof typeof dict;

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nValue>({
  lang: "fr",
  setLang: () => {},
  t: (key) => dict[key].fr,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_KEY);
      if (stored === "fr" || stored === "ht") setLangState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: TranslationKey) => dict[key][lang] ?? dict[key].fr, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
