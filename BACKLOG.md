# Backlog

Open work for the St Ange Auto Service site, grouped by who can do it. Remove an item once it's done. The rules for keeping business data and reviews accurate are in `AGENTS.md`.

## Main priority: Google Business Profile for alignment and brakes (owner)

Goal: more alignment jobs (the new alignment machine) and more brake jobs. The profile drives the map results and the brand panel, where the 5.0 stars show. Audit of the public listing on 2026-11-04: St Ange was not in the top 10 map results for "wheel alignment baytown tx" or "brake repair baytown tx" (searched from outside Texas, so exact positions may differ). Competitors there have alignment or brakes in their name or categories and 98–147 reviews against our 29. Items 2, 3 and 6 take about ten minutes in the dashboard and matter most.

1. **Replace the main photo.** It's a flyer showing the old address, 1300 N Main Street. Use the shop at 108 Schilling Ave instead, and add more photos (there are about four): the new alignment machine, a car on it, a brake job, the bays and the team. Keep adding photos regularly.
2. **Categories.** Primary stays Auto repair shop. Add secondary: Wheel alignment service, Brake shop, Tire shop, Auto air conditioning service, Mechanic.
3. **Services list.** Only "Oil change" shows today. Add every service from the site's service pages with a short description matching the page: Wheel alignment, Brake repair, Brake pad replacement, Rotor replacement, Brake fluid service, Suspension & steering, New & used tires, A/C repair.
4. **Business description.** None shows. Use the 750 characters to mention the new alignment machine, brake repair, Baytown and the ZIP codes 77520, 77521 and 77523.
5. **Posts.** First post: "New alignment machine" with a photo and a Call button. Then every week or two, alternating alignment and brakes, plus seasonal A/C checks and tire offers.
6. **Links.** Website: the homepage. Appointment link: `https://www.stangeautoservice.com/services/car-alignment#quote`.
7. **Reviews.** Ask alignment and brake customers to say what was done ("alignment", "brake job"), since reviews mentioning a service help the listing rank for it. Reply to every review and name the service in the reply. New reviews also feed the site; see the refresh checklist in `AGENTS.md`.
8. **Fix other listings** (details under "Directory listings" below). Mismatched name, address and phone weaken the map ranking.

## Website (code)

Goal: take up more of Google's results page and give the existing result more detail.

- **Site name and logo in search results.** Add `WebSite` structured data on the homepage (`name`: "St Ange Auto Service", `alternateName`: "St. Ange Auto Service", `url`) so Google shows the business name above the result instead of the domain. Make sure the business JSON-LD keeps its `logo` for the brand panel. Done when Google's Rich Results Test reads both. Google can take weeks to show the name.
- **Breadcrumbs on every page.** Service pages already have `BreadcrumbList` JSON-LD; add it to the homepage, `/services`, `/reviews`, `/about` and `/contact-us` so every result shows the "St Ange Auto Service › Services › Brake Repair" style path. Build it from the same helper in `src/seo/serviceSchema.js`.
- **Address, phone and hours in every meta description.** Each page's description should end with the full address, phone and short hours (for example "108 Schilling Ave, Baytown, TX 77520 · 832-572-7121 · Open Mon–Sat from 8 AM"), generated from `src/config/business.js` so it updates with the config. Google often shows this text as the snippet.
- **Google Search Console.** Verify the domain, submit `https://www.stangeautoservice.com/sitemap.xml`, and request indexing for the homepage, `/reviews` and the service pages after each release that adds or changes them.

## Directory listings (owner)

Claimed listings with the same name, address and phone fill more of the results page when people search the shop's name, and some show their own stars.

- Found on 2026-11-04:
  - **Yelp** shows the old 1300 N Main St and a different phone, (832) 677-4680. Ask the owner whether that's an old number.
  - **MapQuest** shows 1300 N Main St.
  - **Facebook** About still lists 1300 N Main St alongside the new address.
- Claim or update Yelp, Facebook, MapQuest, BBB, Bing Places (ChatGPT search relies on Bing), Apple Business Connect and the Baytown Chamber of Commerce with the new address and 832-572-7121.
- When a listing is live, add its URL to `sameAs` in `src/seo/localBusinessSchema.js`.

## Waiting on owner confirmation

Customers mention these in reviews. They can only become shop statements on the site once the owner confirms them (see review rule 9 in `AGENTS.md`).

- Naming Roger, and Juan, as the people who work on customers' cars.
- The Hunter alignment rack, and whether the shop can align lowered cars.
- Whether the shop works on European and Asian makes.
- Transmission work and no-start diagnostics as services, possibly with their own service pages.

## Tooling

- **Automated review check.** Design and limits are in `AGENTS.md` under "Planned: automated review check".

## Not pursuing

- **Review stars in the regular search results.** Google doesn't show stars for a business's reviews of itself on its own site. Stars come from the Business Profile (map results and brand panel) and from directory listings.
- **FAQ and how-to rich results.** Google limits FAQ results to government and health sites and has dropped how-to results.
