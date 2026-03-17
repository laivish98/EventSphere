/**
 * ImageSearchService
 * Provides smart image suggestions based on event title and description.
 */

const KEYWORD_IMAGE_MAP = {
    music: [
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800',
        'https://images.unsplash.com/photo-1514525253361-bee8a18742ca?q=80&w=800',
        'https://images.unsplash.com/photo-1459749411177-8c275d85d31e?q=80&w=800',
        'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800',
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800',
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=800',
    ],
    tech: [
        'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800',
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800',
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800',
        'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=800',
        'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800',
    ],
    sports: [
        'https://images.unsplash.com/photo-1461896756970-8d5f3964f4f3?q=80&w=800',
        'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=800',
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800',
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=800',
        'https://images.unsplash.com/photo-1461310941160-de270c3a9584?q=80&w=800',
    ],
    party: [
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800',
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800',
        'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800',
        'https://images.unsplash.com/photo-1519671482749-fd09be4ccebf?q=80&w=800',
        'https://images.unsplash.com/photo-1514525253361-bee8a18742ca?q=80&w=800',
    ],
    workshop: [
        'https://images.unsplash.com/photo-1544928147-7972ef03f2cb?q=80&w=800',
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800',
        'https://images.unsplash.com/photo-1541854615901-93c354197834?q=80&w=800',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800',
        'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=800',
    ],
    social: [
        'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800',
        'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=800',
        'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=800',
        'https://images.unsplash.com/photo-1519671482749-fd09be4ccebf?q=80&w=800',
    ],
    gaming: [
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800',
        'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=800',
        'https://images.unsplash.com/photo-1552824734-7164962299fd?q=80&w=800',
    ],
    nature: [
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800',
        'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=800',
        'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=800',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800',
    ],
    art: [
        'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=800',
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800',
        'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?q=80&w=800',
        'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800',
    ],
    coding: [
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800',
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800',
        'https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=800',
    ],
    yoga: [
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800',
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800',
        'https://images.unsplash.com/photo-1510894347713-fc3ed6fdf539?q=80&w=800',
    ],
    business: [
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800',
    ],
    food: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800',
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800',
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800',
    ],
    beach: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=800',
    ]
};

// Map search terms to category keys
const SEARCH_INDEX = {
    ...Object.keys(KEYWORD_IMAGE_MAP).reduce((acc, key) => ({ ...acc, [key]: key }), {}),
    concert: 'music', gig: 'music', band: 'music', performance: 'music', festival: 'music', dance: 'music',
    programming: 'tech', startup: 'tech', hackathon: 'tech', software: 'tech', ai: 'tech', robot: 'tech',
    football: 'sports', cricket: 'sports', match: 'sports', tournament: 'sports', fitness: 'sports', gym: 'sports',
    clubbing: 'party', celebration: 'party', nightlife: 'party', birthday: 'party', wedding: 'party',
    gathering: 'social', meetup: 'social', community: 'social', group: 'social',
    seminar: 'workshop', class: 'workshop', training: 'workshop', learning: 'workshop', education: 'workshop',
    esports: 'gaming', pc: 'gaming', console: 'gaming', streamer: 'gaming',
    outdoor: 'nature', hiking: 'nature', camping: 'nature', scenic: 'nature', mountains: 'nature',
    painting: 'art', gallery: 'art', creative: 'art', exhibition: 'art', design: 'art',
    development: 'coding', web: 'coding', app: 'coding',
    meditation: 'yoga', wellness: 'yoga', health: 'yoga',
    conference: 'business', meeting: 'business', corporate: 'business', finance: 'business',
    dinner: 'food', lunch: 'food', cooking: 'food', restaurant: 'food', cafe: 'food',
    summer: 'beach', ocean: 'beach', vacation: 'beach', sand: 'beach',
};

/**
 * Suggests images based on provided text
 */
export const suggestImages = (text) => {
    if (!text || typeof text !== 'string') return KEYWORD_IMAGE_MAP.social || [];

    const tokens = text.toLowerCase().split(/\W+/);
    const suggestedPools = new Set();

    tokens.forEach(token => {
        if (token && SEARCH_INDEX[token]) {
            suggestedPools.add(SEARCH_INDEX[token]);
        }
    });

    // If no specific keywords found, return the social pool as default
    if (suggestedPools.size === 0) {
        return KEYWORD_IMAGE_MAP.social || [];
    }

    let results = [];
    suggestedPools.forEach(poolKey => {
        if (KEYWORD_IMAGE_MAP[poolKey]) {
            results = [...results, ...KEYWORD_IMAGE_MAP[poolKey]];
        }
    });

    // Fallback if results is somehow still empty
    if (results.length === 0) return KEYWORD_IMAGE_MAP.social || [];

    return [...new Set(results)].slice(0, 16);
};

/**
 * Searches for images based on a query string
 */
export const searchImages = (query) => {
    if (!query || typeof query !== 'string') return Object.values(KEYWORD_IMAGE_MAP).flat().slice(0, 24);

    const term = query.toLowerCase().trim();
    if (!term) return Object.values(KEYWORD_IMAGE_MAP).flat().slice(0, 24);

    const results = [];

    // Check if the term directly matches or is an index key
    Object.keys(SEARCH_INDEX).forEach(key => {
        if (key.includes(term)) {
            const poolKey = SEARCH_INDEX[key];
            if (KEYWORD_IMAGE_MAP[poolKey]) {
                results.push(...KEYWORD_IMAGE_MAP[poolKey]);
            }
        }
    });

    // If no results from search, return general fallback
    if (results.length === 0) return suggestImages(term);

    return [...new Set(results)].slice(0, 24);
};
