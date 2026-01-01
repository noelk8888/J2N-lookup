import { type MainCategoryConfig } from '../types';

export const MAIN_CATEGORIES: MainCategoryConfig[] = [
    {
        id: 'MW',
        name: 'MW',
        sheetId: '1SsMyAxBDwZdSXWLVXScZMo5jsORIDwWMOtTRdRM1i2E',
        enabled: true,
        subcategories: [
            { id: 'TOPS', name: 'Tops', gid: '1280047666' },
            { id: 'SHORTS', name: 'Shorts', gid: '1749838043' },
            { id: 'PANTS', name: 'Pants', gid: '952537748' },
            { id: 'JACKET', name: 'Jacket', gid: '1813017208' },
            { id: 'SKIRT', name: 'Skirt', gid: '' },  // Add GID when available
            { id: 'DRESS', name: 'Dress', gid: '' }   // Add GID when available
        ]
    },
    {
        id: 'LW',
        name: 'LW',
        sheetId: '1vzqJx-XNbHmk3pPJHiGFkIFOlBPSPlNE7A-RlNQI4Vg',
        enabled: true,
        subcategories: [
            { id: 'TOPS', name: 'Tops', gid: '495254849' },
            { id: 'SHORTS', name: 'Shorts', gid: '389707265' },
            { id: 'PANTS', name: 'Pants', gid: '1505082486' },
            { id: 'JACKET', name: 'Jacket', gid: '1316004808' },
            { id: 'DRESS', name: 'Dress', gid: '1934974842' },
            { id: 'SKIRT', name: 'Skirt', gid: '1660488348' }
        ]
    },
    {
        id: 'CW',
        name: 'CW',
        sheetId: '1aA8xJZH7HkjaYPs_PCruEUXrReV8CO2CFJUQIMZYitw',
        enabled: true,
        subcategories: [
            { id: 'TOPS', name: 'Tops', gid: '469538687' },
            { id: 'PANTS', name: 'Pants', gid: '818163376' },
            { id: 'SHORTS', name: 'Shorts', gid: '103803608' },
            { id: 'JACKET', name: 'Jacket', gid: '154532623' },
            { id: 'DRESS', name: 'Dress', gid: '1934411242' },
            { id: 'SKIRT', name: 'Skirt', gid: '950259134' }
        ]
    }
];

// Helper to get subcategories for a main category
export const getSubcategories = (mainCat: 'MW' | 'LW' | 'CW') => {
    return MAIN_CATEGORIES.find(c => c.id === mainCat)?.subcategories || [];
};

// Helper to get main category config
export const getMainCategoryConfig = (mainCat: 'MW' | 'LW' | 'CW') => {
    return MAIN_CATEGORIES.find(c => c.id === mainCat);
};

