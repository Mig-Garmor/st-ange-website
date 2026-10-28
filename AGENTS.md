# St Ange Auto Service website: agent guide

Marketing site for St Ange Auto Service, an auto repair shop in Baytown, TX. Its job is to rank in local search and to give search engines and AI assistants (ChatGPT, Gemini, Perplexity) accurate, verifiable information about the business. Treat every piece of business data as something an AI assistant may repeat to a customer.

Open work, including items waiting on the owner, is tracked in `BACKLOG.md`.

## Stack and commands

- Vue 3, `vite-ssg` (every route is pre-rendered to static HTML), `vite-plugin-pages` (routes from `src/pages/`), Tailwind 3, `@unhead/vue` for head tags. Hosted on Vercel with `cleanUrls`.
- `npm run dev` for local work, `npm run build` to pre-render into `dist/`, `npm run preview` to serve `dist/` on port 4173.
- Always finish with `npm run build` and inspect `dist/`, not just the dev server: the HTML in `dist/` is what crawlers and AI tools read.
- **Deployment:** this repo's own Vercel project builds every merge to `main`, but the live domain (`www.stangeautoservice.com`) is served from a fork of this repo on another GitHub account. Changes go live only after that fork is synced with this repo, so a stale live site after a merge is expected until the sync happens.

## SEO checklist (every page and every release)

- **Title:** unique, under about 65 characters, with the main keyword and "Baytown, TX", brand last.
- **Description:** unique, 160 characters or less, with the service, "Baytown, TX" and the phone number.
- **One H1** per page, including the location for pages about the business ("in Baytown, TX").
- **Keywords:** use the phrases people search, naturally and without stuffing: auto repair, auto repair shop, mechanic, car repair, car service, plus the service name ("brake repair", "wheel alignment"). Every service page should mention "auto repair shop" and Baytown at least once.
- **Images:** every `<img>` has descriptive `alt` text.
- **Canonical and sitemap:** each page's canonical URL must be exactly its sitemap URL (no trailing slash except the homepage). The sitemap is generated from the pre-rendered routes, so a new page appears automatically; check `dist/sitemap.xml` lists it. After the fork is synced, spot-check the live `https://www.stangeautoservice.com/sitemap.xml` and that each listed URL returns 200.
- **robots.txt** (`public/robots.txt`) must keep allowing everything and point to the sitemap.

## Where business data lives

Never type business facts into a page or component. Change the source below and let it flow everywhere.

| Data | Source of truth | Feeds |
|---|---|---|
| Name, phone, email, address, map links, geo, hours | `src/config/business.js` (`business`) | Header, footer, contact page, hours lists, FAQ answers, AutoRepair JSON-LD, `llms.txt` |
| Service list (slug, name, image, summary) | `src/config/business.js` (`services`) | Homepage cards, footer, `/services`, pre-rendered routes, sitemap, `llms.txt` |
| Service page copy (titles, intro, signs, process, FAQs) | `src/content/services.js` | `/services/<slug>`, Service JSON-LD |
| Google reviews, rating and review count | `src/content/reviews.js` | Review cards, Review JSON-LD, AggregateRating, `llms.txt` |
| Review themes and customer reports | `src/content/reviews.js` (`themes` tags, `customerReports`) | Homepage "What customers mention most", `/reviews`, `llms.txt` |
| Reviews page | `src/pages/reviews.vue` | `/reviews`: theme index and every written review, each with an anchor (`#review-<id>`, `#theme-<id>`) |
| Move notice (banner, FAQ, address note) | `src/content/relocation.js` | Banner on every page, homepage FAQ, `llms.txt` |
| Homepage reasons and FAQs | `src/content/home.js` | Homepage |
| Business JSON-LD | `src/seo/localBusinessSchema.js` | Every page |
| Service and breadcrumb JSON-LD | `src/seo/serviceSchema.js` | Service pages |
| Review JSON-LD | `src/seo/reviewsSchema.js` | Homepage, service pages and `/reviews` |
| `llms.txt` (plain-text summary for AI assistants) | `src/seo/llmsTxt.js` | `/llms.txt`, generated at build |
| `sitemap.xml` | `vite.config.js` (`writeSitemap`) | `/sitemap.xml`, generated at build from the pre-rendered routes |

`src/config/business.js`, `src/content/reviews.js`, `src/content/relocation.js` and `src/seo/llmsTxt.js` are imported by `vite.config.js` at build time, so they must use relative imports only (`../config/business.js`), never the `@/` aliases.

## What to update when something changes

- **Address or location:** update `address`, `geo`, `links.maps` and `mapEmbedUrl` in `business.js`, and check `relocation.js` (the banner text, or remove `<RelocationNotice />` from `src/components/wrappers/PageLayout.vue` once it's no longer needed). The address must match the Google Business Profile exactly.
- **Hours:** edit `business.hours` (full and short labels, display text, and `opens`/`closes` for the schema) and `hoursShort`. The FAQ, schema and `llms.txt` read from it.
- **New service:** add it to `services` in `business.js` with a `slug`, then its copy in `src/content/services.js` and an image in `public/assets/`. The page, route, sitemap entry, footer link and `llms.txt` line follow automatically. Check whether any existing review describes it (see below).
- **New page:** add it under `src/pages/`. The sitemap picks it up automatically, but the "Pages" list in `src/seo/llmsTxt.js` is written by hand, so add it there too, and add it to `src/config/navigation.js` if it belongs in the menus.
- **After any of these:** run `npm run build` and check `dist/llms.txt`, the JSON-LD in `dist/index.html` and a service page, and `dist/sitemap.xml`.

## Google reviews: trust rules

The reviews exist so AI assistants can trust and verify them. These rules are what make that possible; don't relax them.

1. **Verbatim only.** Copy the text exactly as Google shows it, including the reviewer's own spelling, punctuation and spacing. Never paraphrase, correct or merge reviews. Long reviews are shortened on screen with CSS only; the data and the HTML keep the full text.
2. **Exact attribution.** `author` is the name exactly as Google displays it. `authorUrl` is the reviewer's Google Maps contributor URL (`https://www.google.com/maps/contrib/<id>/reviews`, without query parameters).
3. **A source link for every review.** `url` is the review's own share link (`https://maps.app.goo.gl/...`). It must redirect to a `google.com/maps/reviews/...` URL containing the shop's place ID `0x9d76a9d056bdbd40`. Check with `curl -s -o /dev/null -w "%{redirect_url}" <url>`.
4. **Numbers match Google.** `googleReviews.rating` and `googleReviews.count` must equal what the profile shows on `googleReviews.capturedAt`. The count includes star-only reviews; only reviews with written text go in the list.
5. **Dates.** Google only shows relative dates, so `postedAgo` is what it displayed on `capturedAt`. Update `capturedAt` and every `postedAgo` on each refresh.
6. **Service tags.** Add a slug to a review's `services` only when its text clearly describes that service (for example, "alignment" for `car-alignment`). If in doubt, leave it untagged; untagged reviews are shown as general reviews and never labelled with a service.
7. **No cherry-picking in `llms.txt`.** It lists every written review. Pages may feature a selection, but if a lower-rated review appears on Google it must be listed in the data like any other.
8. **Theme tags.** Add a theme to a review's `themes` only when its text says it in so many words (for example "honest" or "transparency" for `honesty`, "quick" or "faster than expected" for `speed`). Never type a count anywhere: every "N of M reviews" figure is computed from the tags.
9. **Customer reports are not shop claims.** Each entry in `customerReports` summarizes one review in plain words, points at it with `reviewId`, and is always presented as what a customer reported. Only state a detail as a shop fact (a service, equipment, a staff name, makes worked on) after the owner confirms it, and then put it in the business config or page copy, not in the reports.
10. **Cite review-backed statements.** Any page copy or FAQ answer that relies on what customers said must list its sources with `reviewSource(id, about)`. The `about` text says what the linked review shows, so a reader or AI tool knows what to expect before following the link.

### Review refresh checklist (run on every release)

1. Open the Google Business Profile: Google Maps, search "St Ange Auto Service Baytown", then the Reviews tab, sorted by Newest.
2. Compare with `src/content/reviews.js`. For each new written review, add an entry with `id`, `author`, `rating`, `postedAgo`, `services`, `themes`, `url`, `authorUrl` and `text`. Get `url` from the review's Share button, then Copy Link. If the review reports a specific detail (a price comparison, a make, a turnaround time), consider adding it to `customerReports`.
3. Update `googleReviews.rating`, `googleReviews.count` and `googleReviews.capturedAt`, and refresh `postedAgo` on existing entries.
4. Re-check service tags. As of 2026-10-27 only `car-alignment` (3 reviews) and `ac-repair` (1 review) have matching reviews; `brake-repair`, `suspension-steering` and `tires` show general reviews. A new review naming one of those services should be tagged so it leads on that page.
5. Run `npm run build`, then confirm the new reviews appear in `dist/llms.txt`, on `/reviews`, in the theme counts, and in the Review JSON-LD of the relevant pages.

## Planned: automated review check (not built yet)

The owner wants new reviews detected on release without using the Google Places API. Intended design:

- A script run on demand or on a schedule (for example weekly, or as a pre-release GitHub Action) that uses Playwright or Firecrawl to read the profile's reviews, compares them with `src/content/reviews.js`, and opens a pull request with new entries, updated `count`/`capturedAt`/`postedAgo`, and suggested service tags for a person to confirm. It must never merge or deploy on its own.
- Do not run it on every build. Google's terms restrict automated access to Maps, and Google may show consent pages or CAPTCHAs. The script must stop and report when that happens, never try to get around it, and fail without blocking the build.
- What worked when the reviews were collected by hand on 2026-10-27, likely to break when Google changes its markup:
  - Review blocks are `div.jftiEf[data-review-id]` with the author in `aria-label`.
  - The text is in `.wiI7pd`, expanded by clicking the `button[aria-label="See more"]` buttons.
  - The relative date is in `.rsqaWe`.
  - The reviewer link is the `data-href` of the button containing `/contrib/`.
  - The list loads lazily, so scroll its container until all reviews are present.
  - The share link only exists after clicking Share then "Copy Link"; it was captured by temporarily intercepting `navigator.clipboard.write`/`writeText` in the page.
