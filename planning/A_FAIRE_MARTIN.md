# À faire par Martin (à la main)

Ce fichier liste tout ce que **toi** tu dois faire (comptes, clés, réglages).
Je le mets à jour à chaque lot. Coche les cases au fur et à mesure.

---

## Maintenant (Lot 4 terminé)

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

## Bientôt (Lot 2 — vrai backend)

Je te détaillerai chaque étape le moment venu. En résumé :

- [ ] Créer un compte gratuit sur **supabase.com** (connexion avec GitHub possible).
- [ ] Créer un projet en **région Europe** (Paris ou Francfort).
- [ ] Me transmettre les clés **via les variables d'environnement** (jamais dans le chat).

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
