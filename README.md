# Veebipood

Veebipood on lihtne e-poe rakendus, mis võimaldab kasutajatel toote sirvimist, otsingut kategooriad järgi ja tellimuste tegemist. Rakenduse taga on Node.js/Express backend, mis salvestab kõik andmed mälus. Rakendus demonstreerib REST API, autentimist tokenite abil ja tellimuste haldamist.

## Tehnoloogiad

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3, JavaScript
- **Andmesalv:** In-memory (JSON)
- **Testimine:** Custom test framework (Node.js)
- **CI/CD:** GitHub Actions
- **Container:** Docker & Docker Compose

## Käivitamine

### Docker abil (soovitatud)
```bash
git clone https://github.com/SINU_KONTO/veebipood.git
cd veebipood
docker compose up --build
```

Rakendus on kättesaadav: http://localhost:3000

### Otse Node.js abil
```bash
git clone https://github.com/SINU_KONTO/veebipood.git
cd veebipood
npm install
node src/server.js
```

Server käivitub pordil 3000.

### Testide käivitamine
```bash
npm install
node src/server.js &  # Käivita server taustaprogrammina
sleep 2
node src/test.js
```

## Testikasutajad

Rakenduses on eelmääratud testikasutajad:

| Kasutajanimi | Parool | Nimi |
|---|---|---|
| mari | 1234 | Mari Maasikas |
| jaan | 1234 | Jaan Jansen |


## API endpointid

### Kasutajad

| Meetod | URL | Kirjeldus |
|--------|-----|-----------|
| POST | /api/users/signup | Loo uus kasutaja (username, password, name) |
| POST | /api/users/login | Logi sisse kasutajana (username, password). Tagastab token |
| POST | /api/users/logout | Logi välja. Kustuta sessioon (Authorization header) |
| GET | /api/users/me | Hankige praeguse kasutaja andmed (Authorization header) |

### Tooted

| Meetod | URL | Kirjeldus |
|--------|-----|-----------|
| GET | /api/products | Hankige kõik tooted |
| GET | /api/products/:id | Hankige konkreetne toode ID järgi |
| GET | /api/products/search | Otsi tooteid nime järgi (?name=...) |
| GET | /api/products/categories | Hankige kõik kategooriad |
| GET | /api/products/category/:cat | Hankige tooted kategooria järgi |

### Tellimused

| Meetod | URL | Kirjeldus |
|--------|-----|-----------|
| POST | /api/orders | Loo uus tellimus (Authorization header, items: [{productId, quantity}]) |
| GET | /api/orders | Hankige kõik tellimused |
| GET | /api/orders/me | Hankige kasutaja tellimused (Authorization header) |
| GET | /api/orders/:id | Hankige konkreetne tellimus ID järgi |
| PATCH | /api/orders/:id/status | Uuenda tellimuse staatust (status: "vastu võetud", "töötlemisel", "saadetud", "kohale toimetatud") |

## Arhitektuur

### Arhitektuuritüüp: Monoliitne klient-server (MVC-sarnane)

Rakendus kasutab **monoliitse arhitektuuriga** klient-server rakendust, kus:

**Järeldused:**
1. **Kõik koodi ühes protsessis** — backend ja frontend on sama repositooriumis
2. **Jaotus funktionaalsuse järgi** — src/routes/ kausta on eraldi route-failid (users.js, products.js, orders.js)
3. **Andmesalv mälus** — data.js on keskne andmete hoidla, kõik muutused on sessions-laadsed

### Mis arhitektuur see on?

1. **Monoliitne** — kõik on ühes Express.js rakendusvoos
2. **MVC-sarnane** — eraldi routes (kontrollerid), ühine andmesalv (mudel)
3. **Klient-server** — eraldi frontend (public/) ja backend (src/)

### Miks see arhitektuur on õige?

✅ **Antud kasutusele:**
- Lihtne arendus ja juurutamine
- Kiire väike rakendus demo/kooli projektile
- Miinimaalse infrastruktuuri nõude
- Arendajale lihtne järgmist

### Skaleerimise stsenaarium

Kui rakendus peaks teenindama **1 miljonit kasutajat**, muutsime järgmiselt:

```
                       ┌─────────────────────────┐
                       │    Load Balancer        │
                       │  (Nginx/HAProxy)        │
                       └──────────┬──────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              ┌─────▼──┐    ┌─────▼──┐    ┌─────▼──┐
              │ API 1  │    │ API 2  │    │ API N  │
              │Instance│    │Instance│    │Instance│
              └─────┬──┘    └─────┬──┘    └─────┬──┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
          ┌───▼────┐          ┌───▼────┐        ┌────▼────┐
          │PostgreSQL       │ Redis   │        │ MongoDB │
          │(Users, Orders)  │(Cache)  │        │(Products)
          └────────┘        └────────┘        └─────────┘

            + Message Queue (RabbitMQ) tellimuste töötlemisele
            + Mikroteenus arhitektuur eraldi teenusteks
            + Docker + Kubernetes orkestraatsioon
            + CDN staatilise sisu jaoks
```

**Peamised muutused:**
1. **Andmebaas** — PostgreSQL/MongoDB asendaks in-memory salvet
2. **Mikroteenus** — eri funktionaalsus eraldi teenusteks (auth, products, orders)
3. **API Gateway** — pääs kontrollida kõigile teenustele
4. **Caching** — Redis tellimuste ja toote kõrvalhoidele
5. **Message Queue** — asünkroonne tellimuste töötlemine

## GitHub Actions

GitHub Actions on automatiseeritud pilve töövoog mis käivitatakse iga push/pull-request alusel. Selle rakenduse puhul:

### CI Pipeline (`.github/workflows/ci.yml`)

Pipeline teeb järgmist:

1. **Lae kood alla** — kontrollid välja praeguse kodu
2. **Paigalda Node.js** — versioon 20
3. **Paigalda sõltuvused** — käivita `npm install`
4. **Käivita rakendus** — taustaprogrammina `node src/server.js`
5. **Oota server** — oodake 3 sekundit, kuni server käivitub
6. **Käivita testid** — `node src/test.js`

Kui testid ebaõnnestuvad, töövoog katkeb 🔴
Kui testid läbivad, märgistatakse roheline ✅

Seega iga push/PR-ga kontrollitakse automaatselt, et kood töötab!
