export function playbooksDb(sql) {
  return {
    async activePlaybooks(site) {
      return sql`select intent, content from playbooks where site = ${site} and active order by intent`;
    },
  };
}
