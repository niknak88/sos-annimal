// Vérifie la cohérence des parcours de diagnostic : `node tests/validate.js`
const assert = require("node:assert/strict");
const { SPECIES, LEVELS, COMMON_RESULTS, SYMPTOMS, FICHES } = require("../js/data.js");

const speciesIds = new Set(SPECIES.map((s) => s.id));
const ficheIds = new Set(FICHES.map((f) => f.id));
const errors = [];

function checkResult(where, r) {
  if (!LEVELS[r.level]) errors.push(`${where} : niveau inconnu « ${r.level} »`);
  if (!r.title || !r.summary) errors.push(`${where} : titre ou résumé manquant`);
  for (const f of r.fiches || []) {
    if (!ficheIds.has(f)) errors.push(`${where} : fiche inconnue « ${f} »`);
  }
}

for (const [id, r] of Object.entries(COMMON_RESULTS)) checkResult(`COMMON_RESULTS.${id}`, r);

const seen = new Set();
for (const s of SYMPTOMS) {
  if (seen.has(s.id)) errors.push(`symptôme en double : ${s.id}`);
  seen.add(s.id);
  for (const sp of s.species) {
    if (!speciesIds.has(sp)) errors.push(`${s.id} : espèce inconnue « ${sp} »`);
  }
  if (!s.nodes[s.start]) errors.push(`${s.id} : nœud de départ « ${s.start} » introuvable`);

  // Parcours en profondeur : chaque chemin doit aboutir à un résultat, sans boucle.
  const reached = new Set();
  const walk = (id, stack) => {
    if (stack.includes(id)) return errors.push(`${s.id} : boucle ${[...stack, id].join(" → ")}`);
    const node = s.nodes[id] || COMMON_RESULTS[id];
    if (!node) return errors.push(`${s.id} : « ${stack.at(-1)} » mène à « ${id} » introuvable`);
    reached.add(id);
    if (node.level) return checkResult(`${s.id}.${id}`, node);
    if (!node.q || !node.answers || node.answers.length < 2) {
      return errors.push(`${s.id}.${id} : une question doit avoir un texte et au moins 2 réponses`);
    }
    for (const a of node.answers) walk(a.next, [...stack, id]);
  };
  walk(s.start, []);

  for (const id of Object.keys(s.nodes)) {
    if (!reached.has(id)) errors.push(`${s.id} : nœud « ${id} » jamais atteint`);
  }
}

for (const sp of speciesIds) {
  if (!SYMPTOMS.some((s) => s.species.includes(sp))) errors.push(`aucun symptôme pour l'espèce ${sp}`);
}

assert.deepEqual(errors, [], "\n" + errors.join("\n"));
console.log(`OK : ${SYMPTOMS.length} parcours, ${FICHES.length} fiches vérifiés.`);
