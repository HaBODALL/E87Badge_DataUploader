# 🚀 Notice d'Accompagnement à la Reprise de Projet

Salut ! Si tu lis ce document, c'est que tu reprends les rênes du projet **E87Badge_DataUploader**.
Ne t'inquiète pas, ce document est là pour être ton "Guide de Survie". Même si tu n'as jamais touché à Svelte, Rust ou Tauri, je vais t'expliquer comment tout s'emboîte de manière simple et visuelle.

Mon but est de te donner les clés pour lire le code, faire des modifications simples sans tout casser, et comprendre par où commencer si un problème survient.

---

## 1. Cartographie Mentale (Architecture Globale)

Imagine ce projet comme un restaurant :

*   **La Salle à Manger (Le Front-end - Svelte & Vite) :**
    C'est ce que l'utilisateur voit et touche. L'interface (les boutons, l'outil de recadrage des images) est construite avec **Svelte** (un outil qui génère du HTML/CSS/JavaScript très rapide et léger).
*   **Le Serveur (La Communication - Web Bluetooth) :**
    C'est le lien direct entre notre application et le badge LED (le client). On n'utilise pas de câble, tout passe par les ondes. Le navigateur web gère ça presque tout seul grâce à l'API **Web Bluetooth**.
*   **La Réserve (La Base de données locale - IndexedDB) :**
    Comme on veut que l'app marche même sans internet (hors-ligne) et qu'elle n'envoie pas les images trop vite au badge, on stocke temporairement les images dans le navigateur. On utilise une technologie appelée **IndexedDB** (via la librairie `idb`). C'est comme un petit disque dur caché dans Google Chrome.
*   **Les Murs et les Fondations (Le Back-end natif - Tauri & Rust) :**
    L'application web est géniale, mais on veut aussi qu'elle s'installe sur Windows (.exe) ou Android (.apk) comme une "vraie" application. **Tauri** joue ce rôle : il prend notre site web (la Salle à Manger) et l'enferme dans une fenêtre native ultra-légère en utilisant un peu de langage **Rust** sous le capot.

---

## 2. Visite Guidée du Code (Où trouver quoi ?)

Si tu ouvres le dossier du projet, voici les endroits stratégiques :

*   📁 `src/` : **C'est la maison principale du Front-end.** Si tu veux changer l'aspect visuel, c'est ici que ça se passe.
    *   📄 `src/App.svelte` : C'est la page d'accueil, le point d'entrée de toute l'interface.
    *   📁 `src/lib/components/` : Ce sont des petits morceaux de l'interface réutilisables (les briques Lego).
        *   *Ex:* Si tu veux modifier l'outil qui coupe les images en rond, regarde dans `CircularCropTool.svelte`.
        *   *Ex:* Si tu veux changer l'affichage de la file d'attente, regarde `TransferQueue.svelte`.
    *   📁 `src/lib/store/` : C'est ici qu'on gère la "mémoire" de l'application.
        *   *Ex:* `db.ts` et `queue.ts` gèrent la sauvegarde sur le disque dur du navigateur (la fameuse base de données IndexedDB).
    *   📁 `src/lib/protocol/` : **Attention, zone sensible !** C'est le cerveau qui parle au badge.
        *   *Ex:* `e87-protocol.ts` contient les commandes exactes pour envoyer des données via Bluetooth. Si tu ne sais pas ce que tu fais, évite de modifier les clés cryptographiques ici, sinon le badge refusera de communiquer.

*   📁 `src-tauri/` : **La coquille native.**
    *   Tu n'y toucheras presque jamais, sauf si tu veux changer le nom de l'application Windows, son icône, ou ses permissions Android (ça se passe dans le fichier `tauri.conf.json`).

**En résumé :**
*   Je veux changer un texte de l'interface ? -> 📁 `src/` (les fichiers `.svelte`)
*   Je veux changer la logique de sauvegarde ? -> 📁 `src/lib/store/`
*   Je veux modifier la fenêtre Windows ? -> 📁 `src-tauri/tauri.conf.json`

---

## 3. Les Concepts Clés à retenir (Crash Course)

Pas de panique, voici les 3 concepts pour lire le code de ce projet :

1.  **Svelte (Les composants et la réactivité) :**
    Contrairement à React (que tu connais peut-être de nom), Svelte est très proche du HTML classique. Un fichier `.svelte` a 3 parties :
    *   `<script>` : Où tu mets ton JavaScript (la logique).
    *   Du HTML : Ce qui s'affiche à l'écran.
    *   `<style>` : Le CSS (la peinture).
    *La magie de Svelte 5* : Pour qu'une variable se mette à jour toute seule à l'écran quand on la change, Svelte utilise ce qu'on appelle des "Runes" (comme `$state()`). Si tu vois `let compteur = $state(0);`, ça veut juste dire "Affiche ça, et mets l'écran à jour si le compteur change".

2.  **Web Bluetooth (L'Asynchrone) :**
    Parler au badge prend du temps. On utilise donc partout les mots-clés `async` et `await` dans le code JavaScript.
    *Définition :* Quand tu vois `await sendData()`, ça dit au code : *"Lance l'envoi, mets la suite du code en pause, et préviens-moi quand l'envoi est terminé pour continuer"*.

3.  **La base de données locale (IndexedDB / idb) :**
    On utilise une librairie appelée `idb`. Elle permet d'enregistrer des trucs dans le navigateur sous forme de "Clé = Valeur", un peu comme un dictionnaire. On s'en sert pour sauvegarder la liste des images en attente d'envoi.

---

## 4. Le Flux de la Donnée (Anatomie d'une action)

Suivons le cheminement d'une action centrale : **"Je sélectionne, je recadre et j'envoie une image sur mon badge."**

1.  **Le Choix :** Dans l'interface, l'utilisateur clique pour ajouter une image (Géré par un bouton dans `App.svelte`).
2.  **Le Recadrage (Crop) :** L'image s'ouvre dans le composant `CircularCropTool.svelte`. L'utilisateur la déplace pour qu'elle rentre dans le cercle parfait (le badge a un écran rond de 368x368 pixels).
3.  **La Mise en attente :** Quand on valide, on n'envoie PAS l'image tout de suite au badge ! On la confie à `queue.ts` (dans `src/lib/store/`). Ce fichier enregistre l'image sur le disque dur du navigateur (via IndexedDB).
4.  **Le Facteur (Background Worker) :** Une boucle tourne en tâche de fond. Elle regarde dans la base de données : *"Y a-t-il des images en attente ?"*.
5.  **L'Envoi (Bluetooth) :** Si oui, elle prend la première image et utilise `e87-protocol.ts` pour se connecter au badge en Bluetooth, s'authentifier secrètement, puis découper l'image en tout petits morceaux (des "chunks") pour les envoyer un par un par les airs.

---

## 5. Le Guide de Survie (Débogage & Compilation)

Voici tes outils de tous les jours. Ouvre ton terminal à la racine du projet et tape ces commandes.

### 🛠️ Les Commandes Essentielles

*   **Pour installer les dépendances (La 1ère fois) :**
    ```bash
    pnpm install
    ```
    *C'est quoi ?* Ça télécharge tous les outils nécessaires pour faire tourner le projet.
*   **Pour lancer le projet en mode "Développement Web" :**
    ```bash
    pnpm dev
    ```
    *C'est quoi ?* Ça ouvre un navigateur et tu vois tes modifications de code en temps réel (Temps de rechargement ultra rapide).
*   **Pour lancer le projet en mode "Application Android" :**
    ```bash
    pnpm tauri android dev
    ```
    *C'est quoi ?* Ça compile le code et l'envoie sur un émulateur Android ou ton téléphone branché en USB.
*   **Pour vérifier que tu n'as pas fait de faute de frappe :**
    ```bash
    pnpm check
    ```
    *C'est quoi ?* Un correcteur orthographique pour le code (TypeScript / Svelte). Toujours le faire avant de proposer une modification (Pull Request).

### 🚑 Au Secours, ça ne marche pas !

1.  **"J'ai un écran tout blanc sur le navigateur !"**
    *   **Le Réflexe :** Appuie sur la touche `F12` de ton clavier (ou clique droit -> Inspecter), puis va dans l'onglet **Console**.
    *   **Pourquoi ?** C'est là que le navigateur affiche les erreurs en rouge. Souvent, c'est une faute de frappe dans le code JavaScript (`src/`) ou une variable qui n'existe pas. L'erreur te dira exactement à quelle ligne du fichier regarder.
2.  **"Le badge Bluetooth ne se connecte pas !"**
    *   **Le Réflexe :** Assure-toi que tu as accepté les permissions Bluetooth dans ton navigateur. Attention, sur Windows, Web Bluetooth peut parfois être capricieux : ferme ton navigateur, éteins/rallume le Bluetooth de ton PC, et réessaie.
3.  **"La compilation Rust / Tauri plante avec un énorme texte rouge..."**
    *   **Le Réflexe :** Ne panique pas face au mur de texte. Remonte tout en haut du texte rouge pour trouver la TOUTE PREMIÈRE erreur.
    *   Bien souvent, c'est juste qu'il te manque un outil système (comme les outils de build Android ou Windows SDK) ou que tu as oublié d'installer les dépendances (`pnpm install`). Lis la première phrase attentivement, elle te dit généralement le nom du fichier manquant.

Bonne continuation sur ce projet, tu as toutes les cartes en main pour réussir ! 🚀
