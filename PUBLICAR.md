# Publicar Xoriguer Papers a GitHub

Amb això tindràs:
- l'app publicada a internet (GitHub Pages), gratis i amb HTTPS, a punt per instal·lar al mòbil i a l'ordinador;
- el **vigilant del BOE** funcionant cada dia i avisant-te per correu.

El repositori git local ja està creat i té el primer commit.

---

## 1. Crea el repositori a GitHub

1. Entra a <https://github.com> (crea't un compte si no en tens).
2. Botó **New** (o <https://github.com/new>).
3. **Repository name:** `xoriguer-papers`.
4. **Public.** Amb un compte gratuït, GitHub Pages només funciona amb repositoris públics.
   El repositori només conté el codi de l'app: cap dada de ningú (les nòmines es calculen al mòbil de cada usuari).
5. **No** marquis «Add a README», ni «.gitignore», ni «license»: ja els tenim.
6. **Create repository**.

## 2. Puja el codi

Obre un terminal a la carpeta del projecte i executa (canvia `USUARI` pel teu nom d'usuari de GitHub):

```bash
git remote add origin https://github.com/USUARI/xoriguer-papers.git
```

```bash
git push -u origin main
```

El primer cop s'obrirà una finestra del navegador perquè iniciïs sessió a GitHub (Git Credential Manager).

## 3. Activa GitHub Pages (publicar l'app)

1. Al repositori: **Settings → Pages**.
2. **Source:** *Deploy from a branch*.
3. **Branch:** `main` i carpeta `/ (root)` → **Save**.
4. Al cap d'un minut o dos, l'app serà a `https://USUARI.github.io/xoriguer-papers/`.

## 4. Revisa els permisos de les Actions (vigilant)

1. **Settings → Actions → General**.
2. A **Workflow permissions**, marca **Read and write permissions** → **Save**.
   El vigilant ho necessita per obrir incidències i desar el que ja ha vist.
3. Pestanya **Actions**: si et demana activar els workflows, accepta-ho.
4. Prova'l: **Actions → Vigila fonts oficials (BOE i AEAT) → Run workflow**.
   Si no hi ha novetats, acabarà en verd sense obrir res.

## 5. Rep els avisos per correu

- Botó **Watch** (a dalt del repositori) → **All Activity**, o almenys **Issues**.
- Quan surti al BOE una norma que afecti la nòmina, rebràs un correu amb una incidència «Revisar dades oficials».
  Què cal fer llavors: [REVISIO-ANUAL.md](REVISIO-ANUAL.md).

> **Important:** GitHub atura les tasques programades d'un repositori públic després de 60 dies sense cap commit.
> T'avisarà per correu abans; n'hi ha prou amb entrar a **Actions** i tornar-la a activar (o fer qualsevol commit).

## 6. Instal·la l'app

- **Ordinador (Chrome o Edge):** obre l'adreça de l'app → icona d'instal·lar a la barra d'adreces (o el botó **Instal·lar** de l'app).
- **Android (Chrome):** menú ⋮ → **Instal·la l'aplicació**.
- **iPhone (Safari):** botó compartir → **Afegeix a la pantalla d'inici**.

## 7. Publicar canvis més endavant

1. Fes els canvis.
2. Si has canviat codi, icones o dades, puja el número de `VERSIO` a `sw.js` (p. ex. `pdc-v5` → `pdc-v6`).
3. Comprova-ho:

```bash
npm test
```

4. Desa i puja:

```bash
git add -A
git commit -m "Descripció del canvi"
git push
```

GitHub Pages es torna a publicar sol, i les apps instal·lades s'actualitzen la propera vegada que s'obren amb connexió.
A la pestanya **Actions**, el workflow «Valida dades i tests» et dirà si alguna cosa falla.
