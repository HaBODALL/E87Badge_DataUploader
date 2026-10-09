# 🚀 Notice d'Accompagnement à la Reprise de Projet (Guide Exhaustif)

Bonjour et bienvenue sur le projet **E87Badge_DataUploader** !

Si tu lis ce document, c'est que tu reprends le développement ou la maintenance de cette application. Ne t'inquiète pas, ce document est conçu pour être ton "Guide de Survie" ultime. Mon objectif est de t'expliquer, sans inventer de concepts et en me basant strictement sur le code actuel, comment l'application est architecturée, où trouver les informations critiques, et comment modifier le code en toute sécurité.

---

## 1. Cartographie Mentale (Architecture Globale)

Ce projet est conçu pour être minimaliste, très performant et multi-plateforme. Voici les quatre piliers de l'architecture :

*   **L'Interface Utilisateur (Svelte 5 & Vite) :**
    Le Front-end est développé avec **Svelte**. C'est lui qui affiche la fenêtre de connexion Bluetooth, l'outil de recadrage (`CircularCropTool`) et la file d'attente. L'objectif est d'être léger (pas de gros frameworks comme React).
*   **Le Cœur Métier Bluetooth (`e87-protocol.ts`) :**
    C'est le cerveau de l'application. Il ne passe pas par des APIs serveur. Il communique directement avec le badge LED via l'API **Web Bluetooth** du navigateur. Il gère l'authentification cryptée (le *handshake*) et le découpage des images en petits paquets de données (les *chunks*).
*   **Le Mode Hors-Ligne & Persistance (IndexedDB) :**
    Comme l'application peut être utilisée sans réseau ou subir des déconnexions Bluetooth, les images sont stockées temporairement dans le navigateur via **IndexedDB** (en utilisant la librairie `idb`). Le fichier `queue.ts` s'occupe de dépiler ces images une à une pour ne pas saturer le badge.
*   **La Coquille Native (Tauri v2) :**
    Pour que cette application web devienne un exécutable Windows (`.exe`) ou Android (`.apk`), nous utilisons **Tauri**. Tauri utilise Rust sous le capot pour créer la fenêtre de l'application, mais **toute ta logique métier reste en JavaScript/TypeScript**.

---

## 2. Visite Guidée du Code (L'Arborescence)

Voici la carte détaillée pour t'y retrouver dans le dossier `src/` :

*   📄 `src/App.svelte`
    **Le point d'entrée visuel.** C'est ici que tu trouveras la structure principale de la page (le header, la zone de drag-and-drop, l'appel à la connexion Bluetooth via la fonction `connect()`).
*   📁 `src/lib/components/`
    **Les briques de l'interface :**
    *   `CircularCropTool.svelte` : L'outil interactif qui permet de recadrer une image en cercle parfait (368x368 pixels pour le badge E87).
    *   `TransferQueue.svelte` : Le composant qui affiche l'état d'avancement des images mises en attente.
    *   `StorageInfo.svelte` : Affiche le niveau de batterie et de stockage restant sur le badge.
    *   `TopAppBar.svelte` : La barre de navigation supérieure.
*   📁 `src/lib/protocol/`
    **Le moteur Bluetooth (La zone la plus critique du code) :**
    *   `e87-protocol.ts` : Contient la classe `E87Client`, la logique de connexion (`connectE87`), et surtout la complexe machine d'état d'envoi de fichier (`writeFileE87`). C'est ici que l'image est découpée (`chunkSize = E87_DATA_CHUNK_SIZE = 490`), que le CRC16 est calculé, et que les commandes RCSP (0xc0, 0x80) sont envoyées.
    *   `jl-auth.ts` : Gère le chiffrement obligatoire imposé par la puce JieLi du badge. **Ne modifie jamais les constantes ici sous peine de bloquer la communication.**
*   📁 `src/lib/store/`
    **La gestion des données locales :**
    *   `db.ts` : Configure la base de données locale (IndexedDB).
    *   `queue.ts` : Contient `transferQueue`, le gestionnaire qui prend les bytes de l'image recadrée (`App.svelte` l'appelle avec `transferQueue.add(bytes, filename)`) et planifie leur envoi au badge.
*   📁 `src-tauri/`
    **Configuration de l'application native :**
    *   `tauri.conf.json` : C'est ici que tu peux changer le nom de l'application, la version, ou l'identifiant du bundle Android (ex: `com.e87badge.dev`).

---

## 3. Les Concepts Clés à retenir (Crash Course)

Pour lire ce code, voici les trois piliers techniques à maîtriser :

### A. Svelte (Le Front-end)
Svelte compile le code au lieu de l'exécuter dans le navigateur comme React. Un fichier `.svelte` a trois parties (`<script>`, le HTML, `<style>`).
*   **Réactivité basique :** Dans `App.svelte`, tu verras `let isConnected = false`. Quand on veut forcer la mise à jour de l'écran après une action, tu pourrais voir une assignation sur elle-même (ex: `client = client // trigger reactivity`). Svelte 5 introduit aussi les runes (comme `$state()`) pour la réactivité, mais le principe reste de mettre à jour la variable pour mettre à jour l'écran.
*   **Les Événements :** L'écoute d'un clic se fait via `on:click={connect}`. La communication entre composants se fait parfois via des `CustomEvent` (ex: `CircularCropTool` envoie un événement `crop` récupéré par `handleCrop` dans App.svelte).

### B. L'Asynchronisme et Web Bluetooth
Presque toutes les fonctions dans `e87-protocol.ts` utilisent `async` / `await`.
*   *Pourquoi ?* Parce que parler au badge (via les ondes) prend du temps.
*   *Comment ça se lit ?* `await writeChunkTo(characteristic, chunk)` signifie : "Envoie ce morceau de données au badge, et **mets le code en pause** jusqu'à ce que le système confirme l'envoi, puis passe à la ligne suivante".
*   *Attention:* Le protocole du badge est très sensible. Le code interdit d'envoyer plusieurs requêtes Bluetooth en même temps (`Promise.all` est à proscrire) pour garantir la stabilité de la connexion.

### C. Le Protocole RCSP (JieLi)
Le badge utilise une puce JieLi qui impose des règles strictes.
*   **Les Chunks :** On ne peut pas envoyer une image de 50Ko d'un coup. Le code (`writeFileE87`) découpe l'image en paquets (généralement 490 octets) et les envoie avec des numéros de séquence (`seq`) et de créneaux (`slot`).
*   **Les Notifications :** Le badge "répond" aux requêtes en déclenchant des événements. Le code utilise abondamment `waitForNotificationFrame` pour écouter ces réponses (ACK) avant de continuer.

---

## 4. Le Flux de la Donnée : De l'ordinateur au Badge

Prenons l'action principale : **"J'ajoute une image et elle apparaît sur mon badge"**. Voici exactement comment le code le gère, pas à pas :

1.  **Sélection :**
    L'utilisateur glisse une image dans la zone `.file-drop` (dans `App.svelte`). L'événement `on:drop={handleDrop}` est déclenché.
2.  **Mise en mémoire locale :**
    La fonction `handleFile` crée une URL temporaire (`URL.createObjectURL(file)`). Cette image est passée au composant `<CircularCropTool>`.
3.  **Recadrage et Conversion :**
    L'utilisateur valide le recadrage. `<CircularCropTool>` envoie un événement contenant un Canvas HTML. Dans `App.svelte`, `handleCrop` récupère ce Canvas, le convertit en format JPEG binaire (`Uint8Array`) et appelle `transferQueue.add(bytes, filename)`.
4.  **La File d'attente (IndexedDB) :**
    `queue.ts` intercepte ces `bytes` et les sauvegarde en sécurité sur le disque via IndexedDB. Ainsi, si on ferme l'onglet, l'image n'est pas perdue.
5.  **Le Transfert Bluetooth (`writeFileE87`) :**
    Dès que le badge est connecté et disponible, `queue.ts` extrait l'image et appelle `client.sendImage()`.
    La fonction `writeFileE87` dans `e87-protocol.ts` prend le relais. C'est un processus en 9 phases :
    *   *Phase 1 à 7 :* Négociation cryptographique et envoi de l'heure/langue (`setLanguageE87`).
    *   *Phase 8 :* Envoi des métadonnées du fichier (Taille, et calcul du `crc16xmodem` pour vérifier l'intégrité).
    *   *Phase 9 :* Le fichier est découpé dans une boucle `while (bytesSent < winSize)` et envoyé au badge via la fonction `sendE87Frame(0x80, 0x01, body)`. Le badge répond par un ACK (`0x1D`) pour autoriser la salve suivante.

---

## 5. Le Guide de Survie (Débogage & Compilation)

Voici ton arsenal quotidien pour travailler sur ce code sans stress.

### 🛠️ Les Commandes Essentielles (à taper dans le terminal)

Le projet utilise `pnpm` comme gestionnaire de paquets (plus rapide que `npm`).

*   **Pour tout installer (la première fois) :**
    ```bash
    pnpm install
    ```
*   **Pour lancer le serveur de développement (Le plus utilisé) :**
    ```bash
    pnpm dev
    ```
    *Ce que ça fait :* Lance l'application web sur `http://localhost:5173`. Les modifications du code s'affichent instantanément sans recharger.
*   **Pour valider le code avant un commit (OBLIGATOIRE) :**
    ```bash
    pnpm check
    ```
    *Ce que ça fait :* Vérifie qu'il n'y a pas d'erreur de typage TypeScript ou de syntaxe Svelte. Si cette commande échoue, ne valide pas ton code.
*   **Pour compiler l'application de bureau (Tauri) :**
    ```bash
    pnpm tauri build --no-bundle
    ```
    *Note importante :* Le flag `--no-bundle` est crucial. Il indique à Tauri de générer uniquement un exécutable portable (.exe ou AppImage) et d'éviter la génération très lourde d'un installeur d'installation complet.
*   **Pour lancer l'environnement de développement Android :**
    ```bash
    pnpm tauri android dev
    ```
    *Ce que ça fait :* Lance l'application sur ton téléphone Android branché en USB ou sur un émulateur.

### 🚑 Dépannage Rapide (Que faire si...)

1.  **"J'ai un écran tout blanc sur l'application Web !"**
    *   *Diagnostic :* Appuie sur `F12` et ouvre l'onglet **Console**.
    *   *Raison probable :* Une erreur fatale JavaScript. Regarde le fichier mentionné en rouge, tu as sûrement appelé une variable qui n'existe pas ou mal tapé un composant dans `App.svelte`.
2.  **"Le badge ne veut pas se connecter en Bluetooth !"**
    *   *Diagnostic :* Regarde la console (F12). Si l'erreur mentionne `GATT attempt failed`.
    *   *Raison probable :* Sous Windows, la pile Bluetooth de Chrome est parfois capricieuse (il y a d'ailleurs un commentaire à ce sujet dans `e87-protocol.ts`). Solution : Éteins et rallume le Bluetooth de ton PC, puis recharge la page.
3.  **"L'image reste bloquée en file d'attente à 0% !"**
    *   *Diagnostic :* Le transfert s'est mis en sécurité.
    *   *Raison probable :* Le protocole a reçu une mauvaise réponse (ACK) ou le `crc16` est mauvais. Regarde les logs de la fonction `writeFileE87`. Le badge est très pointilleux : s'il reçoit deux commandes en même temps, il fige. Assure-toi que rien n'appelle `sendImage` en parallèle.
4.  **"La compilation CI (GitHub Actions) plante sur Android !"**
    *   *Raison probable :* Un problème connu avec l'outil de setup Android. Assure-toi que dans tes workflows GitHub (`.github/workflows/`), l'action `setup-android` a bien `packages: ""` défini pour éviter l'installation d'outils dépréciés.
5.  **"La compilation Tauri Rust plante avec un mur de texte rouge..."**
    *   *Diagnostic :* Remonte au TOUT DÉBUT du texte rouge.
    *   *Raison probable :* Ce n'est généralement pas le code qui est cassé, mais ton environnement. Il manque souvent les "C++ Build Tools" sur Windows, ou le SDK Android n'est pas bien lié. Lis la première phrase de l'erreur Rust, elle te donne la réponse 9 fois sur 10.

Tu es maintenant prêt à intervenir sur le projet en toute sérénité. Fais des petits tests, utilise `console.log` pour observer le trafic Bluetooth, et tout se passera bien. Bon code ! 🚀
