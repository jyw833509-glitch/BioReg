// Start each operation only after its predecessor releases the single pg connection.
export async function sequential<T extends readonly unknown[]>(
  tasks: { [K in keyof T]: () => T[K] },
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const results: unknown[] = [];
  for (const task of tasks) results.push(await task());
  return results as { [K in keyof T]: Awaited<T[K]> };
}
