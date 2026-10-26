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
    street: "108 Schilling Ave",
    area: "Schilling Avenue",
    city: "Baytown",
    region: "TX",
    postalCode: "77520",
    country: "US",
  },
  geo: { latitude: 29.7494074, longitude: -94.9660578 },
  hours: [
    {
      label: "Monday – Thursday",
      shortLabel: "Mon – Thu",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
      opens: "08:00",
      closes: "18:00",
      display: "8:00 AM – 6:00 PM",
    },
    {
      label: "Friday – Saturday",
      shortLabel: "Fri – Sat",
      days: ["Friday", "Saturday"],
      opens: "08:00",
      closes: "17:00",
      display: "8:00 AM – 5:00 PM",
    },
    { label: "Sunday", shortLabel: "Sun", days: [], display: "Closed" },
  ],
  hoursShort: "Open Mon–Sat from 8 AM",
  links: {
    maps: "https://maps.app.goo.gl/A8ivrDxLWE9yHxfS6",
    googleProfile: "https://maps.app.goo.gl/kRiqUGChingHzADh6",
    reviews:
      "https://search.google.com/local/reviews?placeid=ChIJiRaP15ZdP4YRQL29VtCpdp0",
    facebook: "https://www.facebook.com/profile.php?id=100092729229414",
  },
  mapEmbedUrl: "https://www.google.com/maps?q=108+Schilling+Ave,+Baytown,+TX+77520&output=embed",
  defaultImage: "/assets/mechanic-bg.webp",
  googleRating: "5.0",
  yearsExperience: "30+",
};

export const fullAddress = `${business.address.street}, ${business.address.city}, ${business.address.region} ${business.address.postalCode}`;
export const shortAddress = `${business.address.street}, ${business.address.city}`;

const openSlots = business.hours.filter((slot) => slot.days.length);
const closedSlots = business.hours.filter((slot) => !slot.days.length);
export const hoursSummary = [
  ...openSlots.map((slot) => `${slot.label} ${slot.display}`),
  `closed ${closedSlots.map((slot) => slot.label).join(" and ")}`,
].join(", ");

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
