# E87Badge_DataUploader

Cette application est une version minimaliste, optimisée et multi-plateforme (PWA, Desktop, Android) permettant de contrôler les badges LED intelligents de type E87 / L8 (basés sur le SoC JieLi AC697) via Web Bluetooth.

## 🎯 Objectifs du Projet

L'objectif principal est de fournir un outil léger, fonctionnel en grande partie hors-ligne et sans fioritures (pas de gros frameworks UI) pour transférer des images sur le badge, avec des améliorations clés d'expérience utilisateur :

* **Mode Frugal / Minimaliste** : Construit avec Svelte 5, Vite, et Tauri pour des applications légères en ressources.
* **Fonctionnement Hors-Ligne** : L'utilisation de Service Workers et d'IndexedDB permet de mettre en file d'attente des images à envoyer même sans connexion, et de charger l'interface sans réseau.
* **Outil de Recadrage (Crop Tool) Amélioré** : Outil interactif permettant un recadrage circulaire (drag & drop, zoom, molette) pour s'adapter parfaitement à l'écran rond du badge (368x368).
* **Gestion Avancée de File d'Attente** : Les transferts sont planifiés et mis en attente pour respecter le délai nécessaire entre deux transferts (anti-spam, évite les erreurs du protocole).
* **Affichage de la Batterie et du Stockage** : Interface dédiée pour connaître l'espace de stockage restant estimé et la batterie du badge.

## 💡 Sources d'Inspiration et Remerciements

Ce projet s'appuie largement sur le travail incroyable réalisé par les communautés open-source :

1. **[AuraCast](https://github.com/Manaiakalani/auracast)** : L'application web open-source de référence pour les badges E87/L8, créée par @Manaiakalani. C'est l'inspiration principale pour l'interface web, le support Web Bluetooth et le concept de l'uploader.
2. **[e87_badge (Python Client & Protocol Docs)](https://github.com/jumpingmushroom/e87_badge)** : Créé par @jumpingmushroom, ce projet contient l'ingénierie inverse approfondie du protocole Bluetooth LE (JieLi RCSP, auth handshake, structure des chunks). Leurs documents techniques ont rendu ce projet possible.
3. **[web-bluetooth-e87](https://github.com/hybridherbst/web-bluetooth-e87)** : Créé par @hybridherbst, pour le travail d'origine sur le reverse-engineering Web Bluetooth et le portage de la cryptographie de l'authentification (libjl_auth).

## 🛠️ Stack Technique

* **Frontend** : Svelte 5 (pour un bundle minimal et des performances élevées) + Vite.
* **Stockage Local** : IndexedDB (via `idb`) pour la file d'attente des transferts et la persistance des images recadrées.
* **Build Natif** : Tauri (v2) pour générer des exécutables portables Windows/Linux, des applications macOS et des APK Android.
* **Connectivité** : Web Bluetooth API native.

## 🚀 Démarrage Rapide (Développement)

```bash
# Installer les dépendances
pnpm install

# Démarrer le serveur de développement (PWA Web)
pnpm run dev

# Démarrer l'environnement de développement Android (Tauri)
pnpm tauri android dev
```
