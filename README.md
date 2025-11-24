
# Groupie Tracker Deluxe

Projet pédagogique respectant toutes les contraintes **Groupie Tracker** (backend en Go, packages standards, tests, gestion erreurs) avec des bonus : filtres avancés, recherche instantanée, géolocalisation Leaflet et interface animée.

## Lancer le projet

```bash
go run .
```

Le serveur écoute sur `http://localhost:8080`.

## Fonctionnalités

- 🔁 Récupération parallélisée et mise en cache des données de l’API officielle.
- 🧭 Page artiste avec géocodage (OpenStreetMap) et affichage dans Leaflet.
- 🧮 Filtres serveur : années de création, premier album, nombre de membres, lieux (checkbox).
- 🔎 Barre de recherche tolérante (nom, membre, lieu, date) avec suggestions au fil de la frappe.
- 🎨 Frontend responsive ultra animé (CSS pur) + interactions JS (cartes, surbrillance, rafraîchissement live).
- 🧪 Tests unitaires sur la logique de filtrage.

## Tests

```bash
go test ./...
```

## Structure

```
.
├── main.go              # serveur, data fetching, API REST
├── static/              # CSS, JS, images
├── templates/           # layout + vues (accueil, artiste)
└── main_test.go        # tests des filtres
```

## Notes

- Les requêtes vers l’API de géocodage incluent un User-Agent personnalisé.
- Aucun package externe Go n’est utilisé (standard library uniquement).
- La commande "Rafraîchir" purge le cache et recharge toutes les données en arrière-plan.