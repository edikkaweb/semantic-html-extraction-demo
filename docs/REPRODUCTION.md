# Construire, importer, reproduire / Build, import, reproduce

Ces trois opérations sont indépendantes. La publication de la démo n’a exécuté aucune nouvelle extraction. Les exemples ci-dessous supposent un shell POSIX, Node.js 22+, `unzip`, et Python 3 pour la troisième opération seulement. Enregistrer les versions effectivement utilisées. Les dépendances des extracteurs restent sous leurs propres licences.

## 1. Construire et servir l’interface

Depuis la racine du dépôt :

```sh
node --version
npm run build
npm test
npm run serve
```

Adresse : `http://127.0.0.1:4180/semantic-html-extraction-demo/`.

Aucune installation npm, aucun Python, aucune requête réseau, aucun extracteur. Le build vérifie le ZIP embarqué, génère `data/display.json`, puis remplace **uniquement le dossier dist de cette démo**. Les fichiers originaux ne sont pas modifiés. Chaque paire est rendue en HTML pour FR et EN. Sans JavaScript, utiliser l’index des comparaisons ; les preuves, sorties complètes et sources restent accessibles.

## 2. Importer et vérifier le paquet archivé

```sh
npm run verify
npm run import
npm run import -- --download
```

- `verify` vérifie le ZIP embarqué et ses références sans écrire de dérivé.
- `import` écrit uniquement les données dérivées.
- `--download` télécharge l’URL figée dans `originals/pin.json`, compare le SHA-256 attendu et le ZIP embarqué, puis vérifie le manifeste et les références. Il ne remplace pas le ZIP original.

Les contrôles portent sur les 71 membres du manifeste, douze entrées HTML, références et versions des outils, 84 verdicts corrigés, 72 champs de sortie effectivement évalués, huit entrées réelles et leur statut de répétition. Les douze verdicts jusText `no_output` n’ont pas d’empreinte de champ évalué ; ils restent non évalués.

Toute divergence arrête l’import avec le fichier ou champ concerné. Ne pas remplacer l’empreinte attendue pour faire passer un fichier : comparer l’archive, le dépôt pérenne et la documentation, puis traiter une nouvelle version comme un import distinct. Les originaux de 1.2.1 restent conservés.

## 3. Relancer les extracteurs, séparément

Le dossier `reproduce/` du ZIP contient son README, un lockfile Node, les scripts et les versions Python épinglées. Les commandes suivantes reprennent ces scripts après inspection, avec des répertoires neufs afin de préserver l’archive.

Depuis la racine de la démo :

```sh
npm run verify
EXPERIMENT_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/edikka-extraction.XXXXXX")"
unzip -q originals/semantic-html-extraction-v1.2.1.zip -d "$EXPERIMENT_ROOT/archive"
cp -R "$EXPERIMENT_ROOT/archive/semantic-html-extraction-v1.2.1/reproduce" "$EXPERIMENT_ROOT/runner"
cd "$EXPERIMENT_ROOT/runner"

node --version > "$EXPERIMENT_ROOT/node-version.txt"
python3 --version > "$EXPERIMENT_ROOT/python-version.txt"
npm ci --ignore-scripts
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-v1.2.txt
.venv/bin/python -m pip freeze > "$EXPERIMENT_ROOT/python-freeze.txt"

SEMANTIC_PROTOCOL_VERSION=1.2.0 \
SEMANTIC_OUTPUT_ROOT="$EXPERIMENT_ROOT/new-controlled-run" \
TRAFILATURA_PYTHON="$PWD/.venv/bin/python" \
MULTITOOL_PYTHON="$PWD/.venv/bin/python" \
node run.mjs
```

Node : `@mozilla/readability 0.6.0`, `jsdom 26.1.0`, dépendances transitives du lockfile. Python : `trafilatura 2.2.0`, `readability-lxml 0.8.4.1`, `newspaper4k 0.9.3.1`, `jusText 3.0.2`, `html2text 2025.4.15`, `markdownify 1.2.2`. Les dépendances transitives Python ne sont pas toutes figées dans le fichier original : conserver `pip freeze` et les versions de runtime pour décrire la nouvelle exécution. Aucune garantie d’identité des sorties futures.

Le runner écrit fixtures, sorties, dates, versions et résultats dans `new-controlled-run/`, jamais dans l’archive ou la démo. Ne pas remplacer `originals/pin.json` avec cette exécution. Le runner embarqué utilise déjà l’évaluateur corrigé ; ne pas écraser ses résultats par les anciens verdicts.

L’addendum est une opération séparée, sur les huit entrées incluses dans `runner/real-pages/inputs/` :

```sh
REAL_PAGE_INPUT_ROOT="$PWD/real-pages/inputs" \
REAL_PAGE_OUTPUT_ROOT="$EXPERIMENT_ROOT/new-real-pages-run" \
TRAFILATURA_PYTHON="$PWD/.venv/bin/python" \
MULTITOOL_PYTHON="$PWD/.venv/bin/python" \
node audit-real-pages.mjs
```

Ce script écrit ses résultats dans `new-real-pages-run/`. Ses références `input` désignent les fichiers d’entrée ; conserver le dossier `runner/real-pages/inputs/` avec les résultats (ou en faire une copie documentée) et l’ensemble `EXPERIMENT_ROOT` pour garder l’expérience autonome. Les champs `source_archive` d’une répétition depuis des entrées explicitement fournies peuvent différer des champs historiques : ne pas les inventer.

L’installation des dépendances exige le réseau. Les scripts passent les octets archivés aux outils ; JSDOM n’exécute pas les scripts et ne charge pas les ressources externes. Le scénario `agent-interaction.html` est une autre expérience et n’est pas déclenché ici.

## English

1. **Build the viewer:** Node.js 22+, `npm run build`, `npm test`, `npm run serve`. No dependency installation, Python, network access or extraction. Static HTML includes full evidence and navigation without JavaScript.
2. **Verify/import an archive:** `npm run verify` is read-only; `npm run import` generates derived data; `npm run import -- --download` compares the pinned public ZIP, embedded ZIP, manifest and references. Integrity failures stop the process; expected hashes and original bytes are never silently replaced.
3. **Rerun extractors:** use the commands above in a newly created `EXPERIMENT_ROOT`. The published `reproduce/` directory is copied into a separate runner; new controlled and real-page outputs have separate destinations, dates and versions. Keep runtime versions, `pip freeze`, the input directory and all new results. Python transitive dependencies are not fully locked in the original requirements; do not promise identical future outputs.

The demo publication did not execute a new extraction. The archived protocol, corrected package, revised evaluator and demo versions remain separate. See the original README and licence inside the ZIP before reproducing.
