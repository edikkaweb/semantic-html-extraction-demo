# Vérifications / Verification

## Données et génération

```sh
npm run build
npm test
```

Les onze tests vérifient : empreinte du ZIP et octets originaux, rejet des corruptions/références contradictoires, fidélité des 84 verdicts et champs corrigés, 42 paires dans les deux langues UI, `no_output` et erreur isolée, titre/texte/niveau, valeurs/colonnes/lignes/Markdown, réserve/rattachement non évalué, deux sorties instables de newspaper4k, huit contre-tests archivés, références locales sous le chemin GitHub Pages. Ces tests ne relancent pas les extracteurs.

## Navigateur (optionnel)

Les dépendances ne sont nécessaires qu’aux vérifications navigateur, jamais au build ni à la publication statique :

```sh
npm install --no-save --package-lock=false playwright@1.63.0 axe-core@4.10.3
npm run serve
# Dans un autre terminal, avec Chrome installé :
node tests/browser.cjs
```

Autre base ou résultats : `DEMO_URL=https://edikkaweb.github.io/semantic-html-extraction-demo/ TEST_OUTPUT=/tmp/semantic-demo-check node tests/browser.cjs`.

Firefox : installer son navigateur Playwright avec `npx playwright install firefox`, puis `BROWSER=firefox node tests/browser.cjs`. Le script utilise un nouveau navigateur de test, jamais une session personnelle.

Le script contrôle les 84 pages sans JavaScript à 390 px, 16 scénarios complémentaires (4 sélections × 2 largeurs × avec/sans JS), deux variantes, liens directs et rechargement, paramètres inconnus/répétés, sélecteurs et détails au clavier, absence de requête distante de fonctionnement, ainsi que huit surfaces FR/EN avec axe. Il conserve les vérifications indéterminées d’axe dans son rapport. Les captures sont produites dans `test-results/`, hors Git.

Une vérification visuelle humaine du rendu et un essai clavier réel complètent l’automatisation. Aucun résultat automatisé n’est une déclaration de conformité complète. Pas de test de lecteur d’écran, d’agent IA autonome ni de classement des extracteurs. Aucun résultat d’extraction n’est simulé dans la démo ; la donnée d’erreur synthétique est confinée au test unitaire.

## English

`npm test` checks integrity, corrected verdict fidelity, all bilingual comparison pages and local references. Optional browser tests check all 84 pages without JavaScript, 16 additional responsive/JS scenarios, keyboard focus and disclosure controls, project-path deep links, unknown parameters, offline runtime resources and eight axe surfaces. Reports retain incomplete checks. These are bounded checks, not a complete accessibility audit. No new extraction, screen-reader test or autonomous-agent test is claimed.
