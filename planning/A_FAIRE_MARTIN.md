# À faire par Martin (à la main)

Ce fichier liste tout ce que **toi** tu dois faire (comptes, clés, réglages).
Je le mets à jour à chaque lot. Coche les cases au fur et à mesure.

---

## À regarder tout de suite

- [ ] **Nouvelle page d'accueil** et **nouvelle accroche** : dis-moi si elles te plaisent (voir les autres propositions d'accroche dans la conversation).
- [ ] **Choisis ta convention collective** dans Réglages → Règles du planning, et vérifie la liste « À vérifier ».

## Maintenant (Lot 2a terminé) — brancher la vraie base de données

Compte environ **30 minutes**. Fais les étapes dans l'ordre, et ne colle **jamais** une clé dans la conversation.

### 1. Créer le projet Supabase (base de données + comptes)
- [ ] Va sur **supabase.com** → « Start your project » → connexion avec GitHub.
- [ ] « New project » :
  - Name : `quinzo`
  - Database password : clique sur « Generate a password » et **garde-le dans un gestionnaire de mots de passe** (tu n'en auras presque jamais besoin, mais il ne se récupère pas).
  - Region : **West EU (Paris)** — c'est important pour le RGPD (données en Europe).
  - Plan : Free.
- [ ] Attends 2 minutes que le projet soit prêt.

### 2. Créer les tables (copier-coller, 3 fois, dans l'ordre)
- [ ] Dans Supabase, menu de gauche → **SQL Editor** → « New query ».
- [ ] Sur GitHub, ouvre le fichier `planning/supabase/migrations/20261122000001_schema.sql`, bouton « Copy raw file », colle-le dans l'éditeur, clique **Run**. Tu dois lire « Success. No rows returned ».
- [ ] Recommence avec `planning/supabase/migrations/20261122000002_security.sql`.
- [ ] Puis avec `planning/supabase/migrations/20261123000003_multi_etablissements.sql` (plusieurs établissements + convention collective).
- [ ] Vérifie : menu **Table Editor** → tu vois `establishments`, `employees`, `shifts`… avec un petit badge « RLS enabled » (sécurité activée).

### 3. Régler les comptes (Authentication)
- [ ] Menu **Authentication → Sign In / Providers → Email** : laisse « Enable Email provider » activé, active **Confirm email**, mets « Minimum password length » à **8**.
- [ ] Menu **Authentication → URL Configuration** :
  - Site URL : l'adresse de ton site Vercel (étape 5), par exemple `https://quinzo.vercel.app` (tu pourras la corriger plus tard).
  - Redirect URLs → « Add URL » : `http://localhost:3000/**` puis `https://*.vercel.app/**`
- [ ] À savoir : les e-mails envoyés par Supabase gratuitement sont limités (quelques-uns par heure). Suffisant pour tester ; au Lot 5 on branchera Brevo (service français) pour les vrais envois.

### 4. Récupérer les 2 clés (sans les envoyer à personne)
- [ ] **Project Settings → Data API** : copie « Project URL » (ressemble à `https://abcd1234.supabase.co`).
- [ ] **Project Settings → API Keys** : copie la clé **publishable** (`sb_publishable_…`) — ou « anon public » si c'est un ancien projet. **N'utilise jamais la clé « secret » / « service_role ».**

### 5. Mettre le site en ligne sur Vercel (sans toucher à ton site actuel)
- [ ] **vercel.com** → Sign Up avec GitHub (plan Hobby, gratuit).
- [ ] « Add New… → Project » → importe le dépôt **Empreinte-site**.
- [ ] **Root Directory** → Edit → choisis le dossier **`planning`**.
- [ ] Ouvre « Environment Variables » et ajoute (cocher Production **et** Preview) :
  - `NEXT_PUBLIC_SUPABASE_URL` = la Project URL de l'étape 4
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la clé publishable de l'étape 4
- [ ] Clique **Deploy**. Le premier déploiement (branche principale) peut échouer : normal, l'appli est sur la branche `claude/saas-planning-restaurants-g7efk9`.
- [ ] Dans Vercel → ton projet → onglet **Deployments** : un déploiement « Preview » de cette branche apparaît. Clique dessus → « Visit » : c'est ton site de test, avec les vrais comptes. Envoie-moi seulement **l'adresse** du site (pas les clés).
- [ ] Si Vercel te demande de te connecter pour voir le site de test : c'est la protection des aperçus (normal), garde-la pour l'instant.

### 6. Tester (sur ton téléphone)
- [ ] Crée un compte avec ta vraie adresse, confirme l'e-mail, fais le questionnaire, génère une semaine.
- [ ] Ouvre le site sur un autre appareil et connecte-toi : tu dois retrouver exactement le même planning.

## Lot 4 (fait)

- [ ] **Tester sur ton téléphone** : absences, remplacement, page Heures (voir le message dans la conversation).
- [ ] **Envoyer un export Excel à ton comptable** (depuis ton ordinateur, quand le site sera en ligne) pour lui demander si les colonnes lui conviennent. Dans la version de test claude.ai, les téléchargements sont bloqués : c'est normal.
- [ ] **Choisir les jours fériés où tu es fermé** (Réglages → Jours fériés).

## Lot 3 (fait)

- [ ] **Tester le nouveau moteur** sur la version de test (même lien, recharge la page) — voir le message dans la conversation.
- [ ] **Vérifier tes règles** (Réglages → Règles du planning) avec ta convention collective : 10 h par jour, 11 h de repos, etc. Ce sont des réglages, pas un avis juridique.

## Lot 1 (fait)

- [ ] **Tester sur ton téléphone** la version de test (lien claude.ai envoyé dans la conversation) :
  - Les couleurs terracotta te plaisent-elles ?
  - Ouvre un créneau puis appuie sur le **bouton retour du téléphone** : la fenêtre doit se fermer, sans quitter la page.
  - Va dans **Équipe**, ouvre une fiche, reviens avec la flèche « ← Équipe ».
  - Dans le **questionnaire**, avance de 2 étapes puis fais « retour » : tes réponses doivent être conservées.
- [ ] **Réserver le nom** (si pas encore fait) :
  1. Va sur **ovhcloud.com** (ou gandi.net), tape `quinzo` dans la recherche de domaine.
  2. Prends `quinzo.fr` (ou `quinzo.app` s'il est pris). Compte environ 10 à 15 € par an.
  3. Sur **data.inpi.fr**, onglet « Marques », cherche « Quinzo » pour vérifier que personne ne l'a déposé pour un logiciel.

## Plus tard (Lot 5 — paiement et pages légales)

- [ ] Compte **Stripe** (paiement).
- [ ] Compte **Brevo** (e-mails automatiques, société française).
- [ ] Ton **SIRET**, ton **adresse professionnelle** et la **ville du tribunal** pour les mentions légales et les CGV.
- [ ] Confirmer avec ton comptable que tu es bien en **franchise de TVA** (mention « TVA non applicable, art. 293 B du CGI »).
- [ ] Faire **relire les textes légaux** par un professionnel avant le premier client payant.

---

## Commandes utiles (si tu lances le projet sur ton ordinateur)

```bash
cd planning
npm install      # installe les dépendances (une seule fois)
npm run dev      # lance le site sur http://localhost:3000
npm test         # lance les tests automatiques
npm run build    # vérifie que tout compile
```
