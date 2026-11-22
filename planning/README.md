# Quinzo — le planning d'équipe en 15 minutes

Étape 1 : **maquette cliquable** avec de fausses données (10 employés de restaurant).
Les données sont gardées dans le navigateur (localStorage) ; Supabase arrive à l'étape 2.

```bash
cd planning
npm install
npm run dev      # http://localhost:3000
npm test         # tests automatiques (Vitest)
```

Ce que tu dois faire à la main (comptes, clés…) : voir `A_FAIRE_MARTIN.md`.

Puis ouvrir http://localhost:3000

## Où est quoi

- `app/` : les pages (accueil, connexion, inscription, planning, équipe, besoins, modèles, partage, réglages, lien public `/p/...`)
- `components/planning/` : grille semaine (glisser-déposer), vue jour mobile, alertes, édition d'un créneau
- `lib/engine/check.ts` : LE module de vérification (règles interdites en rouge, préférences en ambre), utilisé partout
- `lib/generate.ts` : génération automatique de la semaine et propositions de renforts
- `lib/rules.ts` : calcul des heures et de la couverture
- `lib/absences.ts`, `lib/holidays.ts`, `lib/week.ts` : absences, jours fériés (calculés), contexte d'une semaine
- `lib/replace.ts` : remplaçants possibles, classés
- `lib/counters.ts`, `lib/export.ts` : compteurs semaine/mois, exports CSV, Excel et JSON
- `lib/employees.ts` : suppression d'un salarié avec anonymisation de l'historique
- `lib/demo-data.ts` : les fausses données
- `lib/history.ts` : bouton retour du téléphone, Échap, flèche « ← Retour »
- `app/globals.css` : le thème (couleurs terracotta) — aucune couleur ailleurs
- `app/fonts/` : la police Inter, hébergée dans le projet
- `tests/` : tests automatiques
