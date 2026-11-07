import type { PostgrestError } from '@supabase/supabase-js';

import { toAppError } from './errors';

// Supabase returns at most 1,000 rows per request (max_rows in
// supabase/config.toml).
const pageSize = 1000;

type Page = PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }>;

// Reads a list that can be longer than one request allows, a page at a time,
// until a short page arrives. `page` runs the query for one range of rows;
// the caller parses the rows it gets back.
export async function fetchAllPages(page: (from: number, to: number) => Page): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw toAppError(error);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) return rows;
  }
}
