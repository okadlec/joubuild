# JouBuild - Kompletní popis aplikace

## Přehled

**JouBuild** je komplexní webová a mobilní platforma pro řízení stavebních projektů. Umožňuje stavebním firmám, projektantům a subdodavatelům spravovat výkresy, úkoly, fotodokumentaci, formuláře a komunikaci na jednom místě.

- **Doména:** Stavebnictví (AEC - Architecture, Engineering, Construction)
- **URL:** https://buildex-eight.vercel.app
- **Mobile App ID:** `com.joubuild.app`

---

## Tech Stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | Next.js 15.3, React 19, TypeScript 5.7, Tailwind CSS 4 |
| Backend / DB | Supabase (PostgreSQL 15, Auth, Realtime, Storage, Edge Functions) |
| Kreslení | Konva.js + React Konva (canvas anotace na výkresech) |
| PDF | pdfjs-dist 5.4 (renderování plánů) |
| Mobilní app | Capacitor 6 (iOS + Android wrapper) |
| UI komponenty | Vlastní shadcn-style knihovna (Avatar, Badge, Button, Card, Dialog, Dropdown, Input, Select, Tabs...) |
| Ikony | Lucide React |
| Monorepo | pnpm workspaces + Turborepo |
| Offline | IndexedDB sync queue, Service Worker (PWA) |

---

## Struktura projektu (Monorepo)

```
buildex/
├── apps/
│   ├── web/                  # Next.js 15 webová aplikace
│   └── mobile/               # Capacitor iOS/Android wrapper
├── packages/
│   ├── shared/               # Sdílené typy, hooky, utility, sync engine
│   ├── supabase/             # Supabase klient, dotazy, realtime
│   └── ui/                   # Sdílená UI knihovna komponent
├── supabase/                 # Migrace, edge functions, config
├── turbo.json                # Build pipeline
└── package.json              # Root config
```

---

## Funkční moduly

### 1. Plány a výkresy (Plans)

Správa stavebních výkresů ve formátu PDF s pokročilým prohlížečem.

**Organizace:**
- **Plan Sets** - skupiny výkresů (např. "Architektura", "Statika")
- **Sheets** - jednotlivé listy výkresů s číslem a názvem
- **Sheet Versions** - verzování výkresů s náhledy (thumbnaily)

**PDF prohlížeč:**
- Renderování PDF na canvasu s vysokým rozlišením (DPR scaling)
- Zoom 0.25x - 3x s pinch-to-zoom na mobilu
- Posouvání (pan), rotace (0°, 90°, 180°, 270°)
- Fullscreen režim
- Navigace mezi stránkami
- Offline cachování PDF souborů
- OCR data (JSONB) pro vyhledávání v textu

**Anotační nástroje (Konva.js):**
- Výběr / ukazatel
- Čára, obdélník, elipsa, cloud shape
- Šipka, textové pole
- Zvýrazňovač (s průhledností)
- Volné kreslení (freehand)
- Měření vzdálenosti (s kalibrací na reálné rozměry)
- Měření plochy
- Hypertextové odkazy na jiné listy/dokumenty/URL
- Paleta barev (červená, modrá, zelená, žlutá, fialová, černá, bílá)
- Tloušťka čáry (1, 2, 3, 5, 8 px)
- Undo/Redo zásobník
- Auto-save do databáze s indikátorem ukládání
- Panel detailů anotace a seznam všech anotací

**Kalibrace:**
- Dvoubodový kalibrační systém
- Nastavení reálné vzdálenosti mezi dvěma body na výkresu
- Převod pixelů na reálné jednotky (metry, cm)
- Trvalá kalibrace per verze listu

### 2. Úkoly (Tasks)

Kompletní systém řízení úkolů s více pohledy.

**Vlastnosti úkolu:**
- Název, popis, stav (otevřený, probíhá, hotovo, uzavřený)
- Priorita (nízká, normální, vysoká, kritická)
- Kategorie (barevně odlišené obory/řemesla)
- Připnutí na výkres (pin s x, y souřadnicemi)
- Přiřazení členovi týmu
- Datum zahájení a termín dokončení
- Odhadované vs. skutečné hodiny a náklady
- Propojení s listem výkresu
- Checklist položky s označením splnění
- Komentáře s @zmínkami a real-time aktualizací
- Tagy a sledující (watchers)

**Pohledy na úkoly:**
- **Kanban board** - drag & drop sloupce podle stavu (4 sloupce)
- **Seznam** - řaditelná tabulka
- **Kalendář** - zobrazení podle termínu
- **Ganttův diagram** - časová osa projektu
- **Filtry** - podle stavu, priority, kategorie, přiřazení, fulltextové vyhledávání

### 3. Fotodokumentace (Photos)

Správa fotografií s galerií a anotacemi.

- Nahrávání fotek z galerie nebo fotoaparátu
- Drag & drop upload
- Typy: fotografie, video, 360° fotografie
- Generování thumbnailů pro rychlé načítání
- Komprese při uploadu (optimalizace pro mobil)
- Kreslení na fotografie (Photo Markup)
- 360° prohlížeč panoramatických snímků
- Metadata: popis, tagy, datum pořízení, velikost souboru
- Připnutí na výkres (pin s x, y)
- Komentáře k fotografiím
- Propojení s úkoly a listy

### 4. Formuláře (Forms)

Dynamické formuláře s workflow schvalování.

**Šablony formulářů:**
- Stavební deník (denní záznamy)
- Inspekce
- RFI (Request for Information - žádost o informaci)
- Vlastní formuláře
- Definice pomocí JSON schématu

**Životní cyklus:**
- Koncept → Odesláno → Schváleno / Zamítnuto
- Sledování stavu
- Dynamické renderování formulářů

**Správa RFI:**
- Sekvenční číslování
- Stavy: otevřené, zodpovězené, uzavřené
- Termíny odpovědí
- Přiřazení odpovědné osobě

### 5. Dokumenty (Documents)

- Stromová struktura složek
- Upload souborů s metadaty
- Limit 100 MB na soubor
- Sledování MIME typů a velikostí

### 6. Timesheety (Timesheets)

- Záznamy odpracovaných hodin per uživatel
- Propojení s úkoly
- Denní záznamy s popisem
- Organizace podle data

### 7. Reporty a exporty (Reports)

**Plánované reporty:**
- Cron-based automatické generování
- E-mailové doručení příjemcům
- Formáty: PDF, CSV
- Vlastní filtry
- Aktivace/deaktivace

**Exporty:**
- Export úkolů (CSV)
- Export fotografií
- As-built dokumentace
- Stavy: čeká → zpracovává se → dokončeno / selhalo
- Uložení do cloud storage (limit 500 MB)

### 8. Komunikace a notifikace

**Komentáře:**
- Real-time komentáře u úkolů a fotografií (WebSocket)
- @mention systém pro upozornění kolegů
- Editace a mazání vlastních komentářů
- Profily uživatelů s avatary

**Notifikace:**
- Real-time doručení přes WebSocket
- Typy: zmínka v komentáři, přiřazení úkolu, změna stavu, nový komentář, blížící se termín
- Označení přečteno/nepřečteno
- Panel notifikací v hlavičce

---

## Databázové schéma

PostgreSQL 15 s Row-Level Security (RLS) na všech tabulkách.

### Organizace a uživatelé (Multi-tenancy)

```
profiles            - id, email, full_name, avatar_url, is_superadmin
organizations       - id, name, slug, logo_url, plan
organization_members - id, org_id, user_id, role (owner/admin/member/viewer)
```

### Projekty

```
projects            - id, org_id, name, description, address, lat/long,
                      cover_image_url, status (active/archived/completed)
project_members     - id, project_id, user_id, role (admin/member/follower)
```

### Plány

```
plan_sets           - id, project_id, name, sort_order
sheets              - id, plan_set_id, project_id, name, sheet_number,
                      current_version_id, sort_order
sheet_versions      - id, sheet_id, version_number, file_url, thumbnail_url,
                      width, height, page_number, ocr_data (JSONB), is_current
calibrations        - id, sheet_version_id, point1_x/y, point2_x/y,
                      real_distance, created_by
annotations         - id, sheet_version_id, type, data (JSONB), created_by
                      typy: line, rectangle, ellipse, cloud, arrow, text,
                      highlighter, freehand, measurement, area
hyperlinks          - id, sheet_version_id, x, y, width, height,
                      target_type (sheet/document/url), target_id, target_url
```

### Úkoly

```
task_categories     - id, project_id, name, color, icon, sort_order
tasks               - id, project_id, sheet_id, category_id, title,
                      description, status, priority, pin_x/y, assignee_id,
                      start_date, due_date, estimated/actual_hours/cost
checklists          - id, task_id, title, is_checked, sort_order
task_watchers       - task_id, user_id
tags                - id, project_id, name, color
task_tags           - task_id, tag_id
```

### Komunikace

```
comments            - id, task_id, user_id, body
mentions            - id, comment_id, user_id
notifications       - id, user_id, type, title, body, data (JSONB), is_read
```

### Fotografie a dokumenty

```
photos              - id, project_id, task_id, sheet_id, pin_x/y, file_url,
                      thumbnail_url, type (photo/video/photo_360),
                      markup_data, caption, tags, taken_at, file_size
documents           - id, project_id, folder_path, name, file_url,
                      file_size, mime_type
```

### Formuláře

```
form_templates      - id, project_id, name, type, schema (JSONB)
form_submissions    - id, template_id, project_id, data (JSONB),
                      status (draft/submitted/approved/rejected)
rfis                - id, project_id, number, subject, question, answer,
                      status (open/answered/closed), due_date
timesheets          - id, project_id, user_id, task_id, date, hours
```

### Reporty

```
report_schedules    - id, project_id, name, filters (JSONB), schedule_cron,
                      recipients[], format, is_active
exports             - id, project_id, type, status, file_url, config (JSONB)
```

### Storage buckety (Supabase Storage)

| Bucket | Limit | Popis |
|--------|-------|-------|
| plans | 100 MB | PDF soubory výkresů |
| thumbnails | 10 MB | Náhledy listů |
| photos | 50 MB | Fotografie a média |
| documents | 100 MB | Dokumenty projektu |
| exports | 500 MB | Generované reporty |
| avatars | 5 MB | Profilové obrázky |

---

## Autentizace a autorizace

### Autentizace
- **Supabase Auth** - e-mail / heslo
- Login, registrace, obnova hesla
- Server-side i client-side session management
- Middleware pro ochranu rout a refresh tokenů
- Automatický redirect neautorizovaných uživatelů na /login

### RBAC (Role-Based Access Control)

**Úrovně organizace:**

| Akce | Owner | Admin | Member | Viewer |
|------|-------|-------|--------|--------|
| Správa organizace | ✓ | | | |
| Pozvání členů | ✓ | ✓ | | |
| Vytvoření projektu | ✓ | ✓ | ✓ | |
| Editace projektu | ✓ | ✓ | | |

**Úrovně projektu:**

| Akce | Admin | Member | Follower |
|------|-------|--------|----------|
| Správa nastavení | ✓ | | |
| Vytváření/editace úkolů | ✓ | ✓ | |
| Mazání úkolů | ✓ | | |
| Komentáře | ✓ | ✓ | ✓ |
| Upload fotek | ✓ | ✓ | |
| Zobrazení dat | ✓ | ✓ | ✓ |

**Superadmin** - příznak `is_superadmin` na profilu, přístup k /admin dashboardu se systémovými statistikami.

---

## Navigace a stránky

### Autentizační stránky (bez sidebaru)
- `/login` - přihlášení
- `/register` - registrace
- `/forgot-password` - obnova hesla
- `/auth/callback` - OAuth callback

### Dashboard (chráněné routy s DashboardShell)
- `/projects` - seznam projektů s filtrováním a řazením
- `/organization` - nastavení organizace
- `/admin` - superadmin dashboard (statistiky, uživatelé)

### Projekt (`/project/[id]/...`)
- `/plans` - PDF prohlížeč s anotacemi
- `/tasks` - řízení úkolů (Kanban, seznam, kalendář, Gantt)
- `/photos` - fotogalerie s markup
- `/forms` - šablony formulářů a odevzdání
- `/documents` - správa souborů
- `/timesheets` - výkazy práce
- `/reports` - plánování reportů
- `/settings` - nastavení projektu

### Layout
- **Header** - horní navigace s uživatelským menu a notifikacemi
- **Sidebar** - navigace projektu/organizace (desktop)
- **BottomNav** - spodní navigace (mobil)
- **OfflineIndicator** - indikátor offline/online stavu

---

## Mobilní aplikace

### Capacitor 6.0.0
Webová aplikace zabalená jako nativní iOS/Android app.

**Konfigurace:**
```
App ID:   com.joubuild.app
App Name: JouBuild
Web Dir:  www
Server:   https://buildex-eight.vercel.app (remote URL)
```

**Nativní pluginy:**
- **Camera** - fotoaparát a galerie
- **Keyboard** - správa soft klávesnice (resize: body)
- **Splash Screen** - úvodní obrazovka (2s)
- **Status Bar** - tmavý režim (#171717)
- **Push Notifications** - push notifikace
- **Haptics** - vibrační odezva
- **Browser** - otevírání externích URL

**Mobilní optimalizace:**
- Pinch-to-zoom s CSS transform optimalizací
- Offline cachování PDF
- Komprese obrázků při uploadu
- Touch targets min. 44px
- Spodní navigace místo sidebaru

**Podpora platforem:**
- iOS 13.0+
- Android 5.0+ (API 21+)

---

## Offline-first architektura

- **IndexedDB** - fronta offline mutací (sync queue)
- **Service Worker** - PWA podpora pro offline přístup
- **Custom Sync Engine** - engine pro synchronizaci offline změn
- **PDF caching** - cachování výkresů pro offline prohlížení
- **Capacitor Storage** - nativní úložiště na mobilech
- **OfflineIndicator** - vizuální indikátor stavu připojení

---

## Real-time funkce (Supabase Realtime)

WebSocket subscriptions pro živé aktualizace:
- **Komentáře** - nové komentáře se zobrazí okamžitě
- **Notifikace** - doručení notifikací v reálném čase
- **Úkoly** - změny stavu a přiřazení
- **Fotografie** - komentáře k fotografiím

---

## Edge Functions (Supabase)

1. **export-project** - generování exportů projektu (PDF/CSV)
2. **generate-report** - vytváření plánovaných reportů
3. **ocr-process** - OCR rozpoznávání textu v PDF
4. **send-notification** - odesílání push notifikací

---

## Vývojové příkazy

```bash
pnpm dev              # Spustit všechny apps v dev režimu
pnpm dev:web          # Spustit pouze web
pnpm build            # Build všech apps
pnpm lint             # Lint všech balíčků
pnpm typecheck        # Typová kontrola
pnpm clean            # Vyčistit build artefakty
pnpm mobile:ios       # Otevřít iOS v Xcode
pnpm mobile:android   # Otevřít Android ve Studio
pnpm mobile:sync      # Synchronizovat web do mobilních projektů
```

---

## Proměnné prostředí

```env
NEXT_PUBLIC_SUPABASE_URL=       # URL Supabase instance
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Veřejný API klíč
SUPABASE_SERVICE_ROLE_KEY=      # Servisní klíč (server-only)
NEXT_PUBLIC_APP_URL=            # URL aplikace
```

---

## Shrnutí

JouBuild je produkční SaaS platforma pro stavebnictví postavená na moderním full-stack TypeScript stacku. Kombinuje pokročilé nástroje pro práci s výkresy (PDF prohlížeč s anotacemi a měřením), komplexní řízení úkolů (Kanban, Gantt, kalendář), fotodokumentaci s markup nástroji, dynamické formuláře s workflow, správu dokumentů, výkazy práce a automatizované reporty. Celý systém je navržen jako offline-first s real-time synchronizací, multi-tenant architekturou a role-based přístupovými právy. Funguje jako webová i mobilní aplikace (iOS/Android) díky Capacitor wrapperu.
