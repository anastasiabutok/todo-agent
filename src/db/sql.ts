export type SqlValue = string | number | boolean | null;
export interface Sql {
  <T = Record<string, SqlValue>>(
    strings: TemplateStringsArray,
    ...values: SqlValue[]
  ): T[];
}
// Only application-owned SQL may be passed here. User values go through tags.
export function executeDdl(sql: Sql, statement: string): void {
  sql(Object.assign([statement], { raw: [statement] }));
}
