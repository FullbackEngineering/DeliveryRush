import { NodeIO } from '@gltf-transform/core';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  throw new Error('Usage: node tools/extract-traffic-vehicles.mjs <input.glb> <output.glb>');
}

const wanted = [
  /^Box_PBA\.001_0$/i,
  /^Toyota Alphard_SAX_0$/i,
  /^Isuzu Trooper_SAX\.001_0$/i,
  /^Honda Civic Civillian_SAP_0$/i,
];

const io = new NodeIO();
const document = await io.read(input);
const root = document.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];
if (!scene) throw new Error('Source GLB has no scene');

const selected = wanted.map((pattern) => {
  const node = root.listNodes().find((candidate) => pattern.test(candidate.getName()));
  if (!node) throw new Error(`Missing traffic node: ${pattern.source}`);
  return node;
});

// Reparent only the four exact vehicle nodes to the scene and discard the source
// showcase hierarchy. Runtime performs its own grounding and dimension normalization.
for (const node of selected) {
  scene.addChild(node);
  node.setTranslation([0, 0, 0]);
  node.setRotation([0, 0, 0, 1]);
  node.setScale([1, 1, 1]);
}
for (const node of [...root.listNodes()]) {
  if (!selected.includes(node)) node.dispose();
}

await io.write(output, document);
console.log(`Extracted ${selected.map((node) => node.getName()).join(', ')}`);
