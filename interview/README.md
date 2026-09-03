# Préparer et mener l'entretien

> Dossier interne. **Il ne doit pas se trouver sur le laptop du candidat.**

## Publier le repo candidat

Le candidat ne clone jamais ce repo-ci. Il clone
`LYSA-Interview-Candidat`, qui est un **instantané régénéré** de l'application
seule, poussé en **un unique commit**.

Ce commit unique n'est pas une commodité, c'est une condition de
fonctionnement : avec un historique réel, `git log -p src/pricing.js` livre la
réponse de SUP-892 en dix secondes.

À faire une seule fois — créer le repo distant, vide et **privé** :

```bash
gh repo create stephane-bruley/LYSA-Interview-Candidat --private
```

Ensuite, à chaque fois que l'application change :

```bash
npm run publish-candidate -- --dry-run   # ce qui partirait, sans rien pousser
npm run publish-candidate                # demande PUBLISH avant d'écraser
```

Le script publie une liste blanche explicite (`src`, `public`, `db`, `test`,
et les fichiers de configuration) et refuse de pousser s'il trouve la moindre
trace du matériel d'entretien dans l'instantané — référence de ticket, mention
de la grille, ou le montant attendu de SUP-892. Tout fichier ajouté à la racine
du repo reste exclu jusqu'à ce qu'on l'inscrive délibérément dans la liste.

Cible différente : `npm run publish-candidate -- --remote=<url>`, ou la variable
`CANDIDATE_REPO`.

**Suppose que l'exercice fuite au bout de cinq ou six candidats** — repo privé
ou pas. C'est pour ça qu'il y a trois scénarios sur trois terrains différents,
et qu'il en faudra un quatrième d'ici six mois. Révoque l'accès du candidat
après l'entretien.

## Préparer le laptop, la veille

Quinze minutes d'installation ratée le jour J ne t'apprennent rien sur le
candidat et bouffent ton créneau. Tout doit déjà tourner quand il s'assoit.

Clone le **repo candidat**, jamais celui-ci :

```bash
git clone https://github.com/stephane-bruley/LYSA-Interview-Candidat.git lysa-orders
cd lysa-orders
npm install
npm run db:up
npm run db:reset
npm test          # 12 tests, tous verts
npm start         # http://localhost:3000
```

Retire le remote, pour qu'il ne puisse ni pousser chez toi ni remonter à
l'original :

```bash
git remote remove origin
```

Ouvre VS Code sur le dossier, vérifie que Claude Code répond, laisse
l'application tournée sur une fenêtre et le navigateur ouvert. Coupe le
partage d'écran de tes propres notes.

Les tickets se donnent **un par un**, sur papier ou dans un fichier à part —
jamais les trois d'un coup, sinon il optimise son temps au lieu de traiter le
problème qu'il a devant lui.

## Déroulé, environ 2 heures

| | Durée | |
| --- | --- | --- |
| Prise en main | 10 min | Il lance l'app, ouvre le code, se repère. Laisse-le explorer seul. |
| **A** · OPS-214 | 15 min | Le signal tombe dans les 5 premières minutes. |
| **B** · SUP-892 | 40 min | Le plus long. Coupe à 40 min quoi qu'il arrive. |
| **C** · OPS-231 | 45 min | Celui qui teste le mieux le réflexe de test. |
| Relecture | 20 min | Son diff, ses doutes. C'est là que tu notes. |

Si tu n'as qu'1 h 15 : **B seul + relecture**. C'est celui qui couvre le plus.
Si tu veux couper : A tient en 10 minutes et peut se fondre en ouverture de C.

## Les trois règles pendant la séance

**Time-box sans négocier.** Avec Claude Code, l'écart entre un bon candidat et
un faible ne se voit pas sur « fini / pas fini », il se voit sur la première
demi-heure. Un candidat qui n'a pas reproduit le bug de B en 20 minutes t'a
déjà tout dit. Coupe et passe à la suite.

**Ne dis jamais combien il y a de problèmes.** Sinon il compte au lieu de lire.

**Reste silencieux au début de chaque ticket.** Les deux premières minutes de
silence t'apprennent plus que n'importe quelle question. S'il bloque, débloque
d'un cran à la fois — les indices sont dans la grille.

Entretien en anglais : c'est la langue de travail, et savoir énoncer un problème
par écrit avec précision fait partie du poste.

## Ce qu'on mesure

Pas la vitesse, pas le nombre de tickets finis. Trois choses :

1. **Ce qu'il fait avant de lancer l'IA** — reproduire, lire la spec, poser une
   question quand le ticket est flou.
2. **Ses prompts** — c'est le geste quotidien du poste, observé en conditions
   réelles plutôt que par procuration.
3. **Ce qu'il fait du résultat** — est-ce qu'il relit le diff, est-ce qu'il sait
   dire ce dont il n'est pas sûr.

La grille détaillée, ticket par ticket, avec les causes exactes et les questions
qui tranchent : [grille-de-correction.md](grille-de-correction.md).

## Remettre la base à zéro entre deux candidats

```bash
npm run db:reset
git checkout . && git clean -fd
```
