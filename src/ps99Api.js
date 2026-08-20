// Thin wrapper around BIG Games' official Pet Simulator 99 public API.
// Docs: https://github.com/BIG-Games-LLC/ps99-public-api-docs
//
// There is no live "hatch event" or chat feed in this API — /api/exists just
// reports, for every pet/item, how many currently exist in the game. We poll
// it on an interval and diff the counts over time to approximate a hatch rate.

const BASE_URL = "https://ps99.biggamesapi.io";

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`PS99 API request failed: ${path} -> HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.status !== "ok") {
    const msg = json?.error?.message ?? "unknown error";
    throw new Error(`PS99 API error on ${path}: ${msg}`);
  }
  return json.data;
}

/**
 * Fetch the full Pets collection and return the config names of every
 * pet whose category is "Titanic".
 * @returns {Promise<Set<string>>}
 */
export async function fetchTitanicPetNames() {
  const pets = await apiGet("/api/collection/Pets");
  const names = new Set();
  for (const pet of pets) {
    if (pet.category === "Titanic") {
      names.add(pet.configName);
    }
  }
  return names;
}

/**
 * Fetch current exists-counts for every pet, filtered down to Titanic pets,
 * with golden/rainbow/shiny variants summed into the base pet's total.
 * @param {Set<string>} titanicNames
 * @returns {Promise<{timestamp: number, total: number, perPet: Record<string, number>}>}
 */
export async function fetchTitanicCounts(titanicNames) {
  const exists = await apiGet("/api/exists");
  const perPet = {};

  for (const entry of exists) {
    if (entry.category !== "Pet") continue;
    const id = entry.configData?.id;
    if (!id || !titanicNames.has(id)) continue;
    perPet[id] = (perPet[id] ?? 0) + (entry.value ?? 0);
  }

  const total = Object.values(perPet).reduce((sum, v) => sum + v, 0);
  return { timestamp: Date.now(), total, perPet };
}
