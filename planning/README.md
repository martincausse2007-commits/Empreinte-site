# Quinzo — le planning d'équipe en 15 minutes

Étape 1 : **maquette cliquable** avec de fausses données (10 employés de restaurant).
Les données sont gardées dans le navigateur (localStorage) ; Supabase arrive à l'étape 2.

```bash
cd planning
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

## Où est quoi

- `app/` : les pages (accueil, connexion, inscription, planning, équipe, besoins, modèles, partage, réglages, lien public `/p/...`)
- `components/planning/` : grille semaine (glisser-déposer), vue jour mobile, alertes, édition d'un créneau
- `lib/generate.ts` : génération automatique de la semaine
- `lib/rules.ts` : calcul des heures, de la couverture et des alertes
- `lib/demo-data.ts` : les fausses données
