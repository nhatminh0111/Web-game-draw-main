// game/words.js
const wordBank = {
  easy: ['cat', 'dog', 'sun', 'moon', 'tree', 'house', 'car', 'fish', 'bird', 'star', 'apple', 'book', 'chair', 'door', 'flower', 'heart', 'key', 'lamp', 'phone', 'shoe'],
  medium: ['guitar', 'camera', 'castle', 'dragon', 'rocket', 'rainbow', 'volcano', 'penguin', 'elephant', 'butterfly', 'mountain', 'lighthouse', 'submarine', 'dinosaur', 'umbrella', 'telescope', 'pyramid', 'tornado', 'octopus', 'kangaroo'],
  hard: ['microscope', 'parachute', 'hieroglyphics', 'constellation', 'avalanche', 'metamorphosis', 'labyrinth', 'chandelier', 'silhouette', 'archipelago', 'kaleidoscope', 'photosynthesis', 'ventriloquist', 'archaeology', 'acupuncture', 'origami', 'bioluminescence', 'equilibrium']
};

function getRandomWords(count = 3) {
  const allWords = [...wordBank.easy, ...wordBank.medium, ...wordBank.hard];
  const shuffled = allWords.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

module.exports = {
  getRandomWords
};