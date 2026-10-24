// The site is pre-rendered, so each switch happens at the first build after its date.
export const relocation = {
  movesAt: "2026-11-01T00:00:00-05:00",
  noticeUntil: "2027-01-01T00:00:00-06:00",
  moveDay: "Sunday, November 1",
  moveDate: "November 1, 2026",
  distance: "about half a mile",
  previous: {
    street: "1300 N Main St",
    area: "North Main Street",
    // Copied from the Google Business Profile pin; the old values sat ~1.3 km away.
    geo: { latitude: 29.7413353, longitude: -94.963613 },
    maps: "https://maps.app.goo.gl/kRiqUGChingHzADh6",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3464.2548993612645!2d-94.9661879244063!3d29.74133527507762!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x863f5d96d78f1689%3A0x9d76a9d056bdbd40!2sSt%20Ange%20Auto%20Service!5e0!3m2!1sen!2smt!4v1758451884017!5m2!1sen!2smt",
  },
  next: {
    street: "108 Schilling Ave",
    area: "Schilling Avenue",
    geo: { latitude: 29.7494074, longitude: -94.9660578 },
    maps: "https://maps.app.goo.gl/A8ivrDxLWE9yHxfS6",
    mapEmbedUrl: "https://www.google.com/maps?q=108+Schilling+Ave,+Baytown,+TX+77520&output=embed",
  },
};

// __BUILD_TIME__ is set by vite.config.js so the client hydrates with the same date as the pre-render.
const builtAt = new Date(
  typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : globalThis.process?.env?.BUILD_TIME ?? Date.now()
);
export const hasMoved = builtAt >= new Date(relocation.movesAt);
export const showRelocationNotice = builtAt < new Date(relocation.noticeUntil);
const location = hasMoved ? relocation.next : relocation.previous;

export const business = {
  name: "St Ange Auto Service",
  siteUrl: "https://www.stangeautoservice.com",
  email: "st.angeautos@gmail.com",
  phone: {
    display: "832-572-7121",
    href: "tel:+18325727121",
    schema: "+1-832-572-7121",
  },
  address: {
    street: location.street,
    area: location.area,
    city: "Baytown",
    region: "TX",
    postalCode: "77520",
    country: "US",
  },
  geo: location.geo,
  hours: [
    {
      label: "Monday – Saturday",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:00",
      closes: "18:00",
      display: "8:00 AM – 6:00 PM",
    },
    { label: "Sunday", days: [], display: "Closed" },
  ],
  links: {
    maps: location.maps,
    googleProfile: "https://maps.app.goo.gl/kRiqUGChingHzADh6",
    reviews:
      "https://search.google.com/local/reviews?placeid=ChIJiRaP15ZdP4YRQL29VtCpdp0",
    facebook: "https://www.facebook.com/profile.php?id=100092729229414",
  },
  mapEmbedUrl: location.mapEmbedUrl,
  defaultImage: "/assets/mechanic-bg.webp",
  googleRating: "5.0",
  yearsExperience: "30+",
};

export const fullAddress = `${business.address.street}, ${business.address.city}, ${business.address.region} ${business.address.postalCode}`;
export const shortAddress = `${business.address.street}, ${business.address.city}`;

export const services = [
  {
    slug: "car-alignment",
    name: "Car Alignment",
    image: "/assets/car-alignment.webp",
    summary:
      "Car pulling to one side or tires wearing unevenly? We check and adjust your alignment so the car drives straight and your tires last longer.",
  },
  {
    slug: "ac-repair",
    name: "A/C Repair",
    image: "/assets/ac-repair.webp",
    summary:
      "Baytown heat is hard on any A/C. We find out why yours is blowing warm or weak, track down leaks and get the cold air back.",
  },
  {
    slug: "brake-repair",
    name: "Brake Repair",
    image: "/assets/brake-repair.webp",
    summary:
      "Squealing, grinding or a soft pedal? We inspect pads, rotors and the whole brake system, then fix only what needs fixing.",
  },
  {
    slug: "suspension-steering",
    name: "Suspension & Steering",
    image: "/assets/suspension-repair.webp",
    summary:
      "Clunks over bumps, a bouncy ride or loose steering usually mean worn shocks, struts or steering parts. We find the cause and repair it.",
  },
  {
    slug: "tires",
    name: "New & Used Tires",
    image: "/assets/tires-repair.webp",
    summary:
      "Affordable new and quality used tires, mounted and balanced, so you can get back on the road without overspending.",
  },
];
