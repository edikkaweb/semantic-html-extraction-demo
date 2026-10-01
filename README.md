# HTML sémantique : comparer ce que les outils conservent

Démonstration publique d’Edikka / Bertrand Morel. **Interface 1.0.0**, bilingue FR/EN, pour explorer des résultats archivés — aucune extraction ne s’exécute pendant la visite ou le build.

- [Explorer la démo](https://edikkaweb.github.io/semantic-html-extraction-demo/)
- [Instrument dans la bibliothèque Edikka](https://www.edikka.com/bibliotheque#instrument-semantic-html-extraction)
- [Article source](https://www.edikka.com/insights/developpement-web/accessibilite-seo-ia-html-semantique)
- [Paquet public 1.2.1](https://www.edikka.com/docbd/data/semantic-html-extraction-v1.2.1.zip) · [référence permanente](https://doi.org/10.5281/zenodo.22867103)

## Démarrage

Node.js 22 ou version ultérieure. Le build n’a aucune dépendance npm et n’utilise pas le réseau.

```sh
npm run build
npm test
npm run serve
```

Ouvrir `http://127.0.0.1:4180/semantic-html-extraction-demo/`. Le serveur local reproduit volontairement le chemin d’un projet GitHub Pages. `PORT=4181 npm run serve` permet de changer le port.

Les 42 combinaisons famille × langue de document × outil ont chacune deux variantes sur la même page. L’interface FR/EN produit 84 pages de comparaison. Chaque page reste complète sans JavaScript ; l’index permet alors de changer de comparaison. JavaScript améliore les sélecteurs, sans charger de données distantes.

[Exemple de lien direct](https://edikkaweb.github.io/semantic-html-extraction-demo/cases/fr-caveat-fr-readability.html#comparison). La langue de l’interface est distincte de celle du document. Une URL de type `?family=table&document=en&tool=trafilatura&ui=fr` est aussi comprise lorsque JavaScript est actif. Les paramètres inconnus ou répétés affichent un message et conservent la comparaison courante ; sans JS, utiliser les liens statiques de l’index.

## Sources et intégrité

| Objet | Version / statut |
| --- | --- |
| Protocole d’extraction | 1.2.0 |
| Paquet corrigé | 1.2.1 |
| Évaluation révisée | 2.0.0 |
| Démonstration | 1.0.0 |
| Extraction archivée | 20 septembre 2026 |
| Révision de l’évaluation | 21 septembre 2026, sans nouvelle extraction |

ZIP SHA-256 : `34e823e1cb395c50ae6cf87ed56fac75c80aee8dfe2d273aede87893d1199fbe`.

L’import vérifie l’empreinte du ZIP avant de le lire, les 71 membres du manifeste, les références des douze documents, les 84 verdicts, les champs de sortie évalués et les huit pages réelles. Une contradiction arrête le build. L’empreinte attendue n’est jamais remplacée automatiquement.

Les verdicts d’affichage viennent exclusivement du **results.json corrigé**. `results-original-v1.2.0.json` et les champs `evaluation` des sorties brutes sont des éléments historiques, jamais la source d’un verdict affiché. Les extraits visibles sont des sous-chaînes des entrées ou sorties ; les originaux et les champs JSON sources restent accessibles. L’interface n’invente pas de nouvelle mesure.

```sh
npm run verify                    # archive embarquée, sans écriture
npm run import                    # produit data/display.json
npm run import -- --download       # vérifie à nouveau le ZIP public épinglé
```

Le dernier appel vérifie aussi l’égalité du téléchargement et du ZIP embarqué. Il n’écrase pas les originaux. Le build réimporte puis régénère uniquement `dist/` et les données dérivées de cette démonstration.

## Organisation

- `originals/` : ZIP public inchangé et provenance épinglée.
- `src/` : import, génération HTML, interface, serveur local.
- `data/` : dérivé généré, exclu de Git, correspondance explicite avec les champs sources.
- `tests/` : fidélité des données, chemins statiques et tests navigateur.
- `docs/` : reproduction et périmètre des vérifications.
- `dist/` : publication générée, exclue de Git. `sources/` y reprend chaque membre original ; les HTML sont livrés avec le suffixe `.txt` sans changer leurs octets, pour ne pas exécuter les scripts archivés. Le ZIP original reste téléchargeable.
- `.github/workflows/pages.yml` : vérification, build, tests puis publication de `dist` sur GitHub Pages.

## Interprétation

Le corpus contrôlé comprend trois familles de documents synthétiques, avec deux variantes en FR et EN. Les traductions ne sont pas des observations indépendantes. Cinq outils extraient ou sélectionnent du contenu ; deux convertissent en Markdown. Il n’y a aucun classement global.

- **Titre** : texte présent, balisage du titre et niveau sont distincts. Appartenance à une section : non évaluée.
- **Tableau** : ligne de valeurs, en-têtes de colonnes et en-têtes de lignes sont distincts. Une légende XML n’est pas un en-tête de colonne. Une disposition Markdown ne prouve pas la sémantique HTML de l’entrée.
- **Réserve** : présence du texte observée ; rattachement à l’affirmation non évalué. Le cas ne conduit pas à supprimer tous les `aside`.
- `no_output`, `error`, relation non démontrée et `not_evaluated` restent distincts. Aucun `error` n’apparaît dans ce corpus contrôlé ; ce traitement est testé séparément avec une donnée de test, jamais présenté comme une observation archivée.

L’addendum des huit pages Edikka est séparé : échantillon de convenance archivé le 11 septembre 2026, non causal et non représentatif. L’instabilité de **newspaper4k sur article-ai-en** et ses deux sorties restent visibles. Les huit contre-tests concernent l’évaluateur. L’expérience clavier/JavaScript du paquet n’est pas un essai d’agent autonome.

## Tests et reproduction

Voir [REPRODUCTION.md](docs/REPRODUCTION.md) pour les trois opérations distinctes : construire, importer/vérifier, relancer les extracteurs dans un nouveau dossier. Aucune nouvelle extraction n’est nécessaire ni annoncée pour cette publication.

`npm test` vérifie les données et les références statiques, après build. Les tests navigateur optionnels sont décrits dans [TESTING.md](docs/TESTING.md). Leur succès n’est pas une validation complète d’accessibilité. Lecteurs d’écran et agents autonomes ne sont pas testés par cette démonstration.

## Licences et identité visuelle

Nouveau code de la démonstration : [MIT](LICENSE). Originaux Edikka : CC BY 4.0, dans le périmètre de la notice originale incluse au ZIP et publiée dans `dist/sources/LICENSE.md`. Attribution : Edikka / Bertrand Morel, « Semantic HTML extraction protocol v1.2.0 », 2026. Composants tiers, marques et contenu tiers éventuel des archives conservent leurs droits. Le site Edikka complet n’est pas recopié.

La palette (`#0c1a24`, `#f7f7f5`, `#657226`, `#d8e58a`, `#1f4f8d`) et la hiérarchie suivent les styles Edikka examinés. Wave et Noir Pro ne sont pas redistribuées faute de licence de redistribution publique établie ; le rendu utilise Arial/Helvetica et une police système monospace. Aucun script de suivi, cookie, police distante ni service d’IA n’est ajouté à la démo.

## English

**Semantic HTML: compare what tools preserve.** A bilingual static viewer of Edikka’s archived extraction results: 42 paired comparisons, complete evidence, eight supplementary real pages and evaluator counter-tests. The UI language and studied document language are independent.

Run `npm run build`, `npm test`, then `npm run serve` with Node.js 22+. There are no build dependencies, extractor runs or network requests. The build verifies the pinned original package and creates static HTML. `npm run import -- --download` independently checks the public archive; mismatches stop the import.

Displayed verdicts come only from revised `results.json` (evaluation 2.0.0, package 1.2.1, protocol 1.2.0). Original outputs are preserved; their internal evaluation fields are historical. No output is not an absent relationship. Heading section membership and caveat-to-claim attachment are not evaluated. Table values, column headers, row headers and Markdown layout remain separate. These observations establish neither overall tool quality nor accessibility, ranking or AI performance.

The supplementary eight-page corpus is non-causal and non-representative. Both unstable newspaper4k outputs for the English AI article are retained. Evaluator counter-tests are not new extractions. The separate JavaScript experiment is not an autonomous-agent test.

See [reproduction instructions](docs/REPRODUCTION.md), [test scope](docs/TESTING.md), the [English instrument](https://www.edikka.com/en/library#instrument-semantic-html-extraction), and the [permanent package record](https://doi.org/10.5281/zenodo.22867103). New demo code is MIT; original Edikka materials retain CC BY 4.0 within the original notice’s scope and third-party rights remain unchanged.
