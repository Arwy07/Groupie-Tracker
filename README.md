# Groupie Tracker

Application web pédagogique en Go pour explorer des artistes, leurs membres et leurs concerts. Le projet associe une API musicale, une carte interactive, des comptes utilisateurs, des favoris et un parcours de réservation de démonstration.


## Fonctionnalités

- Catalogue et fiches artistes alimentés par l'API Groupie Trackers.
- Recherche et filtres : artistes, membres, années et lieux.
- Cartes Leaflet et coordonnées des lieux disponibles.
- Inscription, connexion, profil et mots de passe hachés avec bcrypt.
- Favoris, panier et historique des commandes de démonstration.
- Paiement simulé sans compte externe ; intégration PayPal sandbox facultative.
- Interface HTML/CSS/JavaScript et stockage MySQL/MariaDB.

Il s'agit d'une application de portfolio : les réservations ne délivrent pas de vrais billets. Les routes PayPal de cette édition acceptent uniquement le mode sandbox.

## 1. Prérequis

- Go 1.25 ou ultérieur.
- MySQL 8 ou MariaDB compatible, lancé localement.
- Une connexion Internet pour télécharger les modules, récupérer les données musicales et charger les ressources cartographiques.
- Git, ou le ZIP téléchargé depuis **Code → Download ZIP**.

```sh
git clone https://github.com/Arwy07/Groupie-Tracker.git
cd Groupie-Tracker
go mod download
```

Exécuter les commandes depuis la racine contenant go.mod, assets et templates.

## 2. Préparer une base dédiée

Ouvrir le client SQL avec un compte autorisé à créer une base et un utilisateur, puis adapter le mot de passe de démonstration :

```sql
CREATE DATABASE groupie_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'groupie'@'127.0.0.1' IDENTIFIED BY 'REPLACE_WITH_YOUR_LOCAL_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON groupie_tracker.* TO 'groupie'@'127.0.0.1';
```

Selon la configuration MySQL/MariaDB locale, le compte peut être associé à localhost plutôt qu'à 127.0.0.1 : aligner l'hôte du compte avec la connexion utilisée. Éviter d'utiliser root comme compte de l'application.

Le programme crée les tables au démarrage : users, sessions, favorites, cart, orders, order_items et terms_acceptance. Aucune donnée réelle d'utilisateur n'est fournie.

## 3. Configurer .env

Windows PowerShell :

```powershell
Copy-Item .env.example .env
```

Linux/macOS :

```sh
cp .env.example .env
```

Ouvrir .env et renseigner :

| Variable | Utilisation |
|---|---|
| DB_DSN | Connexion SQL, obligatoire : utilisateur, mot de passe, hôte, port et base |
| HOST | 127.0.0.1 par défaut, pour une démonstration locale |
| PORT | 8080 par défaut |
| TLS_CERT_FILE / TLS_KEY_FILE | Facultatifs, à fournir ensemble pour HTTPS |
| PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET | Facultatifs, identifiants d'application sandbox |
| PAYPAL_MODE | sandbox uniquement pour le parcours PayPal de cette édition |
| STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY | Module présent dans les sources, non utilisé par les routes de paiement actuelles |

Exemple de structure du DSN, à adapter localement :

```text
DB_DSN=groupie:REPLACE_WITH_YOUR_LOCAL_PASSWORD@tcp(127.0.0.1:3306)/groupie_tracker?parseTime=true&charset=utf8mb4
```

Ne pas laisser le mot de passe d'exemple. Pour un mot de passe contenant des caractères de syntaxe du DSN, suivre le format du pilote go-sql-driver/mysql. Le fichier .env et les certificats sont exclus de Git.

## 4. Lancer le site

```sh
go run .
```

Ouvrir **http://127.0.0.1:8080**. Cette adresse locale fonctionne sans certificat et sans clé PayPal. La base SQL doit être disponible et l'API musicale accessible.

Pour compiler sous Windows :

```powershell
New-Item -ItemType Directory -Force bin
go build -o bin/groupie.exe .
.\bin\groupie.exe
```

Sous Linux/macOS :

```sh
mkdir -p bin
go build -o bin/groupie .
./bin/groupie
```

Lancer l'exécutable depuis la racine du dépôt, car il charge les dossiers assets et templates par des chemins relatifs. Ctrl+C arrête le serveur ; les données restent dans la base.

## 5. Utiliser l'application

1. Parcourir le catalogue et ouvrir une fiche artiste.
2. Créer un compte de démonstration depuis l'inscription, puis se connecter.
3. Ajouter des favoris et utiliser les filtres ou la carte.
4. Ajouter des éléments au panier et ouvrir le récapitulatif.
5. Choisir le paiement de démonstration pour simuler une commande sans transaction financière.

Les nouveaux comptes sont ordinaires. Pour essayer les fonctions d'administration sur sa propre base de démonstration, créer d'abord un compte et lui attribuer explicitement les rôles nécessaires côté SQL. Ne pas utiliser de données personnelles réelles pour les essais.

Certaines coordonnées peuvent être absentes ; les cartes et données dépendent de services externes.

## 6. HTTPS local facultatif

Chaque installation peut générer sa propre paire de fichiers :

```sh
go run ./cmd/devcert
```

La commande crée certs/localhost.crt et certs/localhost.key, sans remplacer des fichiers existants. Aucun certificat partagé ni autorité racine n'est fourni.

Dans .env, renseigner :

```text
TLS_CERT_FILE=certs/localhost.crt
TLS_KEY_FILE=certs/localhost.key
```

Redémarrer et ouvrir **https://localhost:8080**. Le certificat est auto-signé : pour un usage avec confiance établie, utiliser un certificat local approuvé selon son environnement. Le démarrage HTTP local reste disponible en laissant les deux variables vides. Ne jamais distribuer sa clé privée ni installer une autorité racine provenant d'un dépôt tiers.

## 7. PayPal sandbox facultatif

Le paiement simulé ne nécessite aucune clé. Pour essayer PayPal :

1. Créer sa propre application de test dans le [portail développeur PayPal](https://developer.paypal.com/).
2. Utiliser ses comptes et identifiants **sandbox**.
3. Remplir PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET et PAYPAL_MODE=sandbox dans .env.
4. Redémarrer et choisir PayPal dans le parcours de démonstration.

Sans identifiants, les routes PayPal sont désactivées. Le mode production est refusé par cette version. Les secrets restent sur le poste ; aucun paiement réel n'est nécessaire pour présenter le projet.

## Organisation

| Chemin | Contenu |
|---|---|
| main.go | Chargement de .env et démarrage |
| src/go/api, game, geo | API, données artistes et coordonnées |
| src/go/handlers, routes | Pages et routes HTTP |
| src/go/db | Connexion, tables et migrations |
| src/go/session | Sessions et cookies |
| src/go/paypal, stripe | Intégrations de paiement |
| src/go/server, config | Adresse, HTTP/HTTPS et paramètres |
| templates | Vues HTML |
| assets | Styles et images |
| src/js | Interactions du navigateur |
| cmd/devcert | Génération d'un certificat local |

Les dépendances réelles sont déclarées dans go.mod et go.sum : pilote MySQL, bcrypt, dotenv et module Stripe notamment. Aucun outil Node.js n'est nécessaire pour lancer le frontend.

## Tests

```sh
go test ./...
go vet ./...
```

Les tests couvrent notamment l'absence de connexion SQL implicite avec root, la configuration du serveur, les paramètres TLS et les restrictions du mode PayPal.

Un test de schéma facultatif utilise GROUPIE_TEST_DSN, uniquement avec une base jetable dont le nom se termine par _test. Créer cette base séparément et ne jamais utiliser la base habituelle pour ce test.

Windows :

```powershell
$env:GROUPIE_TEST_DSN='groupie:REPLACE_WITH_YOUR_LOCAL_PASSWORD@tcp(127.0.0.1:3306)/groupie_tracker_test?parseTime=true'
go test ./src/go/db -run TestSchemaOnDisposableDatabase -v
```

Donner à ce compte les droits sur cette base de test. Le test crée les tables et contrôle qu'une deuxième initialisation fonctionne aussi.

## Dépannage

| Symptôme | Vérification |
|---|---|
| DB_DSN est requis | Copier .env.example en .env et configurer son compte SQL |
| Connexion SQL refusée | Service démarré, hôte/port, mot de passe, base existante et droits du compte |
| Colonne ou table absente | Lire l'erreur SQL au démarrage et vérifier les permissions CREATE/ALTER |
| Données musicales indisponibles | Connexion Internet et disponibilité de l'API externe |
| Images ou pages absentes | Démarrer depuis la racine et garder assets, templates et src/js |
| Erreur de certificat manquant | Remplir les deux variables TLS ou les laisser toutes deux vides |
| Port déjà utilisé | Changer PORT dans .env puis redémarrer |
| PayPal indisponible | Utiliser le paiement simulé, ou configurer ses identifiants sandbox |
| Une ancienne copie utilise des certificats différents | Garder les configurations séparées ; générer une nouvelle paire pour cette version |

Projet pédagogique de développement web. Pour un déploiement réel, prévoir une revue distincte de l'authentification, de la protection des formulaires, des paiements, des données et de l'exploitation.

