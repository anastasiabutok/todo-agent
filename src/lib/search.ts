export function escapeLike(query: string): string {
  return query.replace(/[!%_]/g, "!$&");
}
