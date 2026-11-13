import { writeFile } from 'node:fs/promises';
const photos = {
  adobo: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Chicken_adobo_meal_20231025.jpg',
  sisig: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Philippine_Sisig.jpg',
};
for (const [name, url] of Object.entries(photos)) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(`assets/meals/${name}.jpg`, bytes);
  console.log(`${name}: ${bytes.length}`);
}
