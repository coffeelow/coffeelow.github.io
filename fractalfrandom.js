/*
let _random = Math.random;
let randSeed = Math.random();
let randFactor = 10000 + 10000 * _random();

Math.random = function () {
  randSeed = (Math.sin(randFactor * randSeed) + 1) / 2;
  randFactor =
    10000 +
    10000 * Math.pow(randSeed, _random() * 1.5 + 0.5) +
    10000 * Math.pow(_random(), randSeed * 1.5 + 0.5);
  return randSeed * 0.999;
};
*/

let _random = Math.random;

// Fraktaler / Pink-Noise Zufallsgenerator
function createFractalRandom(octaves = 8) {
  let values = new Float32Array(octaves);
  for (let i = 0; i < octaves; i++) values[i] = _random();
  let counter = 0;

  return function() {
    counter = (counter + 1) & 0xFFFFFF; // Zähler hochzählen

    // Finde das am wenigsten signifikante Bit, das sich geändert hat (Bit-Magic für Fraktal-Struktur)
    let lastZeroBits = 0;
    let n = counter;
    while ((n & 1) === 0 && lastZeroBits < octaves - 1) {
      lastZeroBits++;
      n >>= 1;
    }

    // Ersetze nur den Wert der entsprechenden Oktave
    values[lastZeroBits] = _random();

    // Summiere alle Oktaven auf
    let sum = 0;
    for (let i = 0; i < octaves; i++) {
      sum += values[i];
    }

    return (sum / octaves) * 0.999; // Normiert zwischen 0.0 und 0.999
  };
}

// Überschreiben von Math.random
Math.random = createFractalRandom(8);
