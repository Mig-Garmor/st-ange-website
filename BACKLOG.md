# Backlog

Open work for the St Ange Auto Service site, grouped by who can do it. Remove an item once it's done. The rules for keeping business data and reviews accurate are in `AGENTS.md`.

## Website (code)

Goal: take up more of Google's results page and give the existing result more detail.

- **Site name and logo in search results.** Add `WebSite` structured data on the homepage (`name`: "St Ange Auto Service", `alternateName`: "St. Ange Auto Service", `url`) so Google shows the business name above the result instead of the domain. Make sure the business JSON-LD keeps its `logo` for the brand panel. Done when Google's Rich Results Test reads both. Google can take weeks to show the name.
- **Breadcrumbs on every page.** Service pages already have `BreadcrumbList` JSON-LD; add it to the homepage, `/services`, `/reviews`, `/about` and `/contact-us` so every result shows the "St Ange Auto Service › Services › Brake Repair" style path. Build it from the same helper in `src/seo/serviceSchema.js`.
- **Address, phone and hours in every meta description.** Each page's description should end with the full address, phone and short hours (for example "108 Schilling Ave, Baytown, TX 77520 · 832-572-7121 · Open Mon–Sat from 8 AM"), generated from `src/config/business.js` so it updates with the config. Google often shows this text as the snippet.
- **Google Search Console.** Verify the domain, submit `https://www.stangeautoservice.com/sitemap.xml`, and request indexing for the homepage, `/reviews` and the service pages after each release that adds or changes them.

## Google Business Profile (owner)

The profile drives the map results and the brand panel, which is where the 5.0 stars show.

- **Categories.** Primary: Auto repair shop. Secondary, for services the shop offers: Brake shop, Tire shop, Wheel alignment service, Auto air conditioning service.
- **Services list.** Add every service from the site's service pages with a short description that matches the page.
- **Links.** Website: the homepage. Appointment link: `https://www.stangeautoservice.com/contact-us`.
- **Address check.** Confirm the profile shows 108 Schilling Ave exactly as the site does.
- **Photos.** The shop at the new address, the team, the bays and equipment. Add new photos regularly.
- **Posts.** Occasional updates: the move to a bigger shop, seasonal A/C checks, tire offers.
- **Reviews.** Ask every customer for a review and suggest they mention the work done ("brake job", "A/C"). Reply to every review. New reviews also feed the site; see the refresh checklist in `AGENTS.md`.

## Directory listings (owner)

Claimed listings with the same name, address and phone fill more of the results page when people search the shop's name, and some show their own stars.

- Claim or update Yelp, Facebook, BBB, Bing Places (ChatGPT search relies on Bing), Apple Business Connect and the Baytown Chamber of Commerce with the new address.
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
