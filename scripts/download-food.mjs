import { mkdir, writeFile } from 'node:fs/promises';
const photos = {
  chicken: '1562967914-608f82629710',
  noodles: '1516100882582-96c3a05fe590',
  burger: '1568901346375-23c9450c58cd',
  fries: '1573080496219-bb080dd4f877',
  tea: '1556679343-c7306c1976bc',
  water: '1602143407151-7111542de6e8',
};
await mkdir('assets/meals', { recursive: true });
await Promise.all(
  Object.entries(photos).map(async ([name, id]) => {
    const response = await fetch(
      `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`,
      { signal: AbortSignal.timeout(45000) },
    );
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(`assets/meals/${name}.jpg`, bytes);
    console.log(`${name}: ${bytes.length}`);
  }),
);
