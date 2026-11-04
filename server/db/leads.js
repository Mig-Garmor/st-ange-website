export function leadsDb(sql) {
  return {
    async upsertLead({ site, name = null, phone = null, email = null, vehicle = null }) {
      const n = name || null, e = email || null, v = vehicle || null;
      if (phone) {
        const [row] = await sql`
          insert into leads (site, name, phone, email, vehicle) values (${site}, ${n}, ${phone}, ${e}, ${v})
          on conflict (site, phone) where phone is not null do update set
            name = coalesce(excluded.name, leads.name), email = coalesce(excluded.email, leads.email),
            vehicle = coalesce(excluded.vehicle, leads.vehicle), updated_at = now()
          returning id`;
        return { id: row.id };
      }
      if (e) {
        const [row] = await sql`
          insert into leads (site, name, email, vehicle) values (${site}, ${n}, ${e}, ${v})
          on conflict (site, lower(email)) where phone is null and email is not null do update set
            name = coalesce(excluded.name, leads.name), vehicle = coalesce(excluded.vehicle, leads.vehicle),
            updated_at = now()
          returning id`;
        return { id: row.id };
      }
      const [row] = await sql`insert into leads (site, name, vehicle) values (${site}, ${n}, ${v}) returning id`;
      return { id: row.id };
    },
  };
}
