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
