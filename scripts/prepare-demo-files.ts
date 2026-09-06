import { copyFile, mkdir, writeFile } from "node:fs/promises";

import calls from "../samples/expected/calls-demo.json";

// docs/spec.md §Task 2 / §Task 3: expose only our owned, synthetic inputs.
await mkdir("public/samples/contracts", { recursive: true });
await mkdir("public/samples/calls", { recursive: true });

for (const name of [
  "synthetic-pirkuma-ligums",
  "synthetic-nomas-ligums",
  "synthetic-pirkuma-nepilns",
]) {
  await copyFile(`samples/contracts/${name}.pdf`, `public/samples/contracts/${name}.pdf`);
}

for (const [id, name] of [
  ["call-a1", "zvans-par-ipasumu"],
  ["call-a2", "zvans-ar-trukumiem"],
]) {
  const call = calls.calls.find((candidate) => candidate.id === id);
  if (!call?.transcript) throw new Error(`Missing synthetic transcript: ${id}`);
  await writeFile(`public/samples/calls/${name}.txt`, `${call.transcript}\n`, "utf8");
}

for (const extension of ["mp3", "txt"]) {
  const name = `sintetisks-zvans-ar-partraukumu.${extension}`;
  await copyFile(`samples/calls/${name}`, `public/samples/calls/${name}`);
}

console.log("Prepared 3 contract PDFs, 3 call transcripts and 1 MP3 for download.");
