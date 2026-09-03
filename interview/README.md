# Préparer et mener l'entretien

> Dossier interne. **Il ne doit pas se trouver sur le laptop du candidat.**

## Publier le repo candidat

Le candidat ne clone jamais ce repo-ci. Il clone
`LYSA-Interview-Candidat`, qui est un **instantané régénéré** de l'application
seule, poussé en **un unique commit**.

Ce commit unique n'est pas une commodité, c'est une condition de
fonctionnement : avec un historique réel, `git log -p src/pricing.js` livre la
réponse du ticket 2 en dix secondes.

Le repo distant est déjà créé, et il est **public** — le candidat travaille sur
le laptop du recruteur, il n'a donc aucun accès à demander ni à révoquer. Le
repo public sert au ré-approvisionnement du laptop, pas au candidat.

À chaque fois que l'application change :

```bash
npm run publish-candidate -- --dry-run   # ce qui partirait, sans rien pousser
npm run publish-candidate                # demande PUBLISH avant d'écraser
```

Le script publie une liste blanche explicite (`src`, `public`, `db`, `test`,
et les fichiers de configuration) et refuse de pousser s'il trouve la moindre
trace du matériel d'entretien dans l'instantané — référence de ticket, mention
de la grille, ou le montant attendu du ticket 2. Tout fichier ajouté à la racine
du repo reste exclu jusqu'à ce qu'on l'inscrive délibérément dans la liste.

Cible différente : `npm run publish-candidate -- --remote=<url>`, ou la variable
`CANDIDATE_REPO`.

**Suppose que l'exercice est déjà connu.** Le repo étant public, il est
indexable : un candidat qui cherche le nom de l'entreprise peut tomber sur
`src/pricing.js` et préparer le ticket 2 à l'avance. C'est pour ça qu'il y a
trois scénarios sur trois terrains différents, et qu'il en faudra un quatrième
— plus tôt que dans six mois.

Le signal reste largement intact même préparé : le ticket 1 ne se prépare pas
(on observe s'il pose la question), et pour les tickets 2 et 3 ce qu'on regarde
est la méthode et les prompts, pas la trouvaille. Mais si un candidat arrive en
sachant exactement où est le bug sans jamais avoir lancé l'application, tu le
verras — demande-lui de reproduire devant toi.

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
npm start         # http://localhost:4000
```

Retire le remote, pour qu'il ne puisse ni pousser chez toi ni remonter à
l'original :

```bash
git remote remove origin
```

Ouvre VS Code sur le dossier, vérifie que Claude Code répond, laisse
l'application tournée sur une fenêtre et le navigateur ouvert. Coupe le
partage d'écran de tes propres notes.

Les tickets sont numérotés dans l'ordre où il doit les traiter :

```
1-FEATURE-archive-inactive-customers.md
2-BUGFIX-invoice_total.md
3-FEATURE-export-ordres-csv.md
```

Copie **uniquement le dossier `tickets/`** sur son poste, jamais `interview/`
en entier — la grille de correction est dans le dossier parent.

```bash
cp -r interview/tickets ~/Desktop/lysa-tickets
```

Il voit donc les trois d'emblée. Rappelle-lui à l'oral de les prendre dans
l'ordre et de ne pas ouvrir le suivant avant que tu ne le dises : le time-box
n'a de sens que s'il ne sait pas encore ce qui vient après.

## Déroulé, environ 2 heures

| | Durée | |
| --- | --- | --- |
| Prise en main | 10 min | Il lance l'app, ouvre le code, se repère. Laisse-le explorer seul. |
| **1** · Feature archivage | 15 min | Le signal tombe dans les 5 premières minutes. |
| **2** · Bugfix facturation | 40 min | Le plus long. Coupe à 40 min quoi qu'il arrive. |
| **3** · Feature export CSV | 45 min | Celui qui teste le mieux le réflexe de test. |
| Relecture | 20 min | Son diff, ses doutes. C'est là que tu notes. |

Si tu n'as qu'1 h 15 : **le ticket 2 seul + relecture**. C'est celui qui couvre
le plus.
Si tu veux couper : le ticket 1 tient en 10 minutes et peut se fondre en
ouverture du ticket 3.

## Les trois règles pendant la séance

**Time-box sans négocier.** Avec Claude Code, l'écart entre un bon candidat et
un faible ne se voit pas sur « fini / pas fini », il se voit sur la première
demi-heure. Un candidat qui n'a pas reproduit le bug du ticket 2 en 20 minutes
t'a déjà tout dit. Coupe et passe à la suite.

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
