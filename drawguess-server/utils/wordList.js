/**
 * Word List for DrawGuess Game
 * Danh sách từ để vẽ, phân loại theo độ khó
 */

const EASY_WORDS = [
    'cat', 'dog', 'sun', 'moon', 'star', 'tree', 'fish', 'bird', 'car', 'house',
    'apple', 'book', 'ball', 'cup', 'hat', 'shoe', 'flower', 'cloud', 'heart', 'smile'
];

const MEDIUM_WORDS = [
    'elephant', 'rainbow', 'guitar', 'camera', 'pizza', 'rocket', 'dragon', 'castle',
    'penguin', 'butterfly', 'umbrella', 'bicycle', 'volcano', 'diamond', 'crown',
    'lighthouse', 'telescope', 'pyramid', 'octopus', 'helicopter'
];

const HARD_WORDS = [
    'microscope', 'constellation', 'archaeology', 'equilibrium', 'photosynthesis',
    'architecture', 'metamorphosis', 'kaleidoscope', 'silhouette', 'hieroglyphics',
    'chromosome', 'thermometer', 'stethoscope', 'parallelogram', 'refrigerator'
];

const ALL_WORDS = [...EASY_WORDS, ...MEDIUM_WORDS, ...HARD_WORDS];

/**
 * Get random words from the word list
 * @param {number} count - Number of words to return (default: 3)
 * @param {string} difficulty - 'easy', 'medium', 'hard', or 'mixed' (default: 'mixed')
 * @returns {string[]} Array of random words
 */
function getRandomWords(count = 3, difficulty = 'mixed') {
    let wordPool;
    
    switch (difficulty) {
        case 'easy':
            wordPool = EASY_WORDS;
            break;
        case 'medium':
            wordPool = MEDIUM_WORDS;
            break;
        case 'hard':
            wordPool = HARD_WORDS;
            break;
        case 'mixed':
        default:
            wordPool = ALL_WORDS;
            break;
    }
    
    // Shuffle and pick random words
    const shuffled = [...wordPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get word by difficulty
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {string} Random word of specified difficulty
 */
function getWordByDifficulty(difficulty) {
    const words = getRandomWords(1, difficulty);
    return words[0];
}

module.exports = {
    EASY_WORDS,
    MEDIUM_WORDS,
    HARD_WORDS,
    ALL_WORDS,
    getRandomWords,
    getWordByDifficulty
};
