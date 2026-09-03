# Grille de correction

> À ne pas donner au candidat.

Ce qu'on mesure n'est pas « a-t-il fini ». Avec Claude Code, presque tout le
monde finit. Ce qu'on mesure, c'est **ce qu'il fait avant de lancer l'IA**, et
**ce qu'il fait du résultat qu'elle lui rend**.

Trois signaux transversaux, à observer sur les trois tickets :

- **Est-ce qu'il lance l'application ?** Ou est-ce qu'il ne lit que le code.
- **Ses prompts.** « fix the bug » contre un prompt qui décrit le symptôme, la
  règle métier et la contrainte. C'est le meilleur prédicteur du poste.
- **Est-ce qu'il relit le diff ?** Ou est-ce qu'il l'accepte et passe à la suite.

---

## 1 · Feature — Archiver les clients inactifs

**Ce qui est piégé :** le mot **inactif** n'est défini nulle part. Ni dans le
ticket, ni dans le schéma, ni dans le code. Il n'existe aucune colonne, aucune
règle, aucun précédent.

Silences supplémentaires du ticket : que fait-on d'un client qui a une commande
`open` ? (Red River Logistics en a une, vieille de 250 jours.) Peut-on
désarchiver ? Que voit l'opérateur si une partie de la sélection échoue ?

**Le signal tombe dans les 5 premières minutes.**

| | |
| --- | --- |
| **Excellent** | Il pose la question avant d'écrire quoi que ce soit, et propose une définition à valider : « aucune commande depuis 12 mois et aucune commande ouverte — c'est ça ? » |
| **Bon** | Il implémente, mais il écrit son hypothèse noir sur blanc et te la signale spontanément à la fin. |
| **Faible** | Il laisse Claude Code choisir une définition, livre, et ne sait pas te dire quelle règle a été appliquée. |
| **Rejet** | Il archive simplement les ids sélectionnés, sans aucun test d'inactivité. Le mot central du ticket a été ignoré. |

**Réponds si on te demande** — mais note qui a demandé : « inactif = aucune
commande depuis 12 mois. Un client avec une commande ouverte ne doit pas être
archivé. »

**Aussi à regarder :** « en masse » veut dire N mises à jour. Une boucle avec un
`await` par client passe ; un seul `update ... where id = any($1)` est la bonne
réponse. Demande-lui ce qui se passe si le client n° 3 sur 10 échoue.

---

## 2 · Bugfix — Total faux sur SO-1043

**La cause :** dans `src/pricing.js`, la TVA est calculée sur `afterVolume`,
c'est-à-dire **avant** la remise contractuelle, alors que la règle 3 écrite en
tête du fichier dit que la TVA s'applique en dernier, sur le total remisé.

```js
const vat = afterVolume * VAT_RATE;              // faux
const total = afterVolume - contractDiscount + vat;
```

```js
const taxable = afterVolume - contractDiscount;  // correct
const vat = taxable * VAT_RATE;
const total = taxable + vat;
```

L'écart vaut exactement `afterVolume × 8 % × taux_contrat`.

**Le motif à découvrir :** seules les commandes des clients ayant une remise
contractuelle sont fausses. 8 commandes sur 14 sont justes — c'est pour ça que
Finance dit « les autres avaient l'air bonnes ». Un candidat qui compare
plusieurs commandes trouve le motif *avant* d'ouvrir le code, et sait alors
exactement quoi chercher.

| | |
| --- | --- |
| **Excellent** | Reproduit, isole le motif (remise contractuelle > 0), lit la règle 3 du fichier, corrige, et écrit un test qu'il vérifie rouge avant / vert après. |
| **Bon** | Trouve la cause par la lecture du code, corrige juste, teste. |
| **Faible** | Demande à Claude Code de « corriger le bug de calcul » et accepte le premier patch sans avoir reproduit. |
| **Rejet** | Corrige le symptôme (retouche `Math.round`, ou ajuste `total` sans toucher à `vat`), ou modifie le nombre attendu au lieu du code. |

**La question qui tranche, à poser à la fin :** *« si tu annules ta correction,
est-ce que ton test devient rouge ? »* Un test écrit avec
`contractDiscountRate: 0` passe dans les deux cas et ne prouve rien. Fais-le
faire devant toi, ça prend trente secondes.

**Vérifie aussi** que les 5 tests existants de `pricing.test.js` sont toujours
verts après sa correction — ils le restent, ils utilisent tous un taux
contractuel à 0.

---

## 3 · Feature — Export CSV

**Ce qui est piégé :** le client **`Nguyen Trading, Ltd`** contient une virgule.
Une implémentation naïve qui fait `values.join(',')` produit un CSV décalé d'une
colonne — et ça ne se voit que si on ouvre le fichier, ou si on teste avec ce
client-là. Il a 3 commandes dans les données de démo, donc le bug est visible
immédiatement pour qui vérifie son travail.

Le ticket dit « le fichier s'ouvre correctement dans Excel » sans dire comment :
il faut échapper les guillemets, et un BOM UTF-8 est nécessaire pour que les
caractères vietnamiens s'affichent.

| | |
| --- | --- |
| **Excellent** | Échappe correctement, teste avec un nom contenant une virgule, réutilise `orderTotal` au lieu de recalculer, et ouvre le fichier pour vérifier. |
| **Bon** | Échappe correctement, mais son test n'utilise qu'un nom simple. |
| **Faible** | `join(',')`, test qui passe, bug invisible. Le fichier est cassé pour 3 commandes sur 14. |
| **Rejet** | Recalcule le total dans l'export au lieu d'appeler `orderTotal` — deux sources de vérité pour le même chiffre, et le bug du ticket 2 devient invisible sur l'export. |

**À demander :** *« exporte-moi Nguyen Trading, Ltd et ouvre le fichier. »*

---

## Après les trois tickets

Vingt minutes de relecture avec lui. Une seule consigne : **« montre-moi ton
diff et dis-moi ce que tu pousserais en production sans hésiter, et ce sur quoi
tu as un doute. »**

Un candidat qui n'a aucun doute sur du code qu'il n'a pas écrit est le profil
qui coûte cher. Un candidat qui te dit « ça, je l'ai pris tel quel de Claude et
je ne suis pas sûr de comprendre pourquoi ça marche » est honnête, et formable.
