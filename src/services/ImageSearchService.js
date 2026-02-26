/**
 * ImageSearchService
 * Provides smart image suggestions based on event title and description.
 */

const KEYWORD_IMAGE_MAP = {
    music: [
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600',
        'https://images.unsplash.com/photo-1514525253361-bee8a18742ca?q=80&w=600',
        'https://images.unsplash.com/photo-1459749411177-8c275d85d31e?q=80&w=600',
        'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=600',
    ],
    tech: [
        'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600',
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600',
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=600',
        'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=600',
    ],
    sports: [
        'https://images.unsplash.com/photo-1461896756970-8d5f3964f4f3?q=80&w=600',
        'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=600',
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=600',
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=600',
    ],
    party: [
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600',
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600',
        'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=600',
        'https://images.unsplash.com/photo-1519671482749-fd09be4ccebf?q=80&w=600',
    ],
    workshop: [
        'https://images.unsplash.com/photo-1544928147-7972ef03f2cb?q=80&w=600',
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600',
        'https://images.unsplash.com/photo-1541854615901-93c354197834?q=80&w=600',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600',
    ],
    food: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600',
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600',
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600',
        'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=600',
    ],
    nature: [
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600',
        'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=600',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600',
        'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=600',
    ],
    art: [
        'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=600',
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600',
        'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?q=80&w=600',
        'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=600',
    ]
};

// Aliases for keywords
const ALIASES = {
    concert: 'music',
    gig: 'music',
    band: 'music',
    performance: 'music',
    coding: 'tech',
    programming: 'tech',
    startup: 'tech',
    hackathon: 'tech',
    software: 'tech',
    football: 'sports',
    cricket: 'sports',
    match: 'sports',
    tournament: 'sports',
    fitness: 'sports',
    clubbing: 'party',
    celebration: 'party',
    nightlife: 'party',
    festival: 'party',
    seminar: 'workshop',
    class: 'workshop',
    training: 'workshop',
    learning: 'workshop',
    dinner: 'food',
    lunch: 'food',
    cooking: 'food',
    restaurant: 'food',
    outdoor: 'nature',
    hiking: 'nature',
    camping: 'nature',
    scenic: 'nature',
    painting: 'art',
    gallery: 'art',
    creative: 'art',
    exhibition: 'art'
};

/**
 * Suggests images based on provided text
 * @param {string} text - Title or description
 * @returns {string[]} Array of image URLs
 */
export const suggestImages = (text) => {
    if (!text) return [];

    const tokens = text.toLowerCase().split(/\W+/);
    const suggestedPools = new Set();

    tokens.forEach(token => {
        if (KEYWORD_IMAGE_MAP[token]) {
            suggestedPools.add(token);
        } else if (ALIASES[token]) {
            suggestedPools.add(ALIASES[token]);
        }
    });

    // If no specific keywords found, return a default social pool
    if (suggestedPools.size === 0) {
        return KEYWORD_IMAGE_MAP.party;
    }

    let results = [];
    suggestedPools.forEach(poolKey => {
        results = [...results, ...KEYWORD_IMAGE_MAP[poolKey]];
    });

    // Return unique images, limited to 8
    return [...new Set(results)].slice(0, 8);
};
