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
    street: "1300 N Main St",
    city: "Baytown",
    region: "TX",
    postalCode: "77520",
    country: "US",
  },
  // Copied from the Google Business Profile pin; the old values sat ~1.3 km away.
  geo: { latitude: 29.7413353, longitude: -94.963613 },
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
    maps: "https://maps.app.goo.gl/kRiqUGChingHzADh6",
    reviews:
      "https://search.google.com/local/reviews?placeid=ChIJiRaP15ZdP4YRQL29VtCpdp0",
    facebook: "https://www.facebook.com/profile.php?id=100092729229414",
  },
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3464.2548993612645!2d-94.9661879244063!3d29.74133527507762!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x863f5d96d78f1689%3A0x9d76a9d056bdbd40!2sSt%20Ange%20Auto%20Service!5e0!3m2!1sen!2smt!4v1758451884017!5m2!1sen!2smt",
  defaultImage: "/assets/mechanic-bg.webp",
};

export const fullAddress = `${business.address.street}, ${business.address.city}, ${business.address.region} ${business.address.postalCode}`;
export const shortAddress = `${business.address.street}, ${business.address.city}`;

export const services = [
  { name: "Car Alignment", image: "/assets/car-alignment.webp" },
  { name: "A/C Repair", image: "/assets/ac-repair.webp" },
  { name: "Brake Repair", image: "/assets/brake-repair.webp" },
  { name: "Suspension & Steering", image: "/assets/suspension-repair.webp" },
  { name: "New & Used Tires", image: "/assets/tires-repair.webp" },
];
