import Papa from 'papaparse';
import { type Listing } from '../types';

// Helper to convert drive open links to viewable/embeddable image links
const transformDriveLink = (url: string): string => {
    if (!url) return '';

    // Extract the file ID from various Google Drive URL formats
    let fileId = '';

    if (url.includes('drive.google.com/open?id=')) {
        fileId = url.split('open?id=')[1]?.split('&')[0] || '';
    } else if (url.includes('drive.google.com/file/d/')) {
        fileId = url.split('/file/d/')[1]?.split('/')[0] || '';
    } else if (url.includes('id=')) {
        fileId = url.split('id=')[1]?.split('&')[0] || '';
    }

    if (fileId) {
        // Use lh3.googleusercontent.com which works for embedding
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    return url;
};


// Helper to parse currency/number strings
const parseNumber = (val: string): number => {
    if (!val) return 0;
    // Remove currency symbols, commas, parentheses for negative, etc.
    const clean = val.replace(/[^\d.-]/g, '');
    return parseFloat(clean) || 0;
};

export const fetchCategoryData = async (sheetId: string, gid: string): Promise<Listing[]> => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: false, // We use index based mapping
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as string[][];
                // Skip header rows? The CSV provided had multiple header rows.
                // We should probably filter for rows that have an Item Code (Col M / Index 12)

                const listings: Listing[] = rows
                    .filter(row => {
                        // Basic validation: Must have an Item Code and maybe a Cost
                        return row[12] && row[12].trim() !== '' && row[12] !== 'CAT';
                    })
                    .map((row, index) => {
                        return {
                            id: `${row[12]}-${index}`, // ItemCode + index as fallback ID
                            photoLink: transformDriveLink(row[1]), // Col B -> Index 1
                            brand: row[9], // Col J -> Index 9 (Brand)
                            colL: row[11], // Col L -> Index 11
                            itemCode: row[12], // Col M -> Index 12
                            cost: parseNumber(row[22]), // Col W -> Index 22

                            lastDate: row[30], // Col AE -> Index 30

                            statusGood: row[31], // Col AF
                            statusRepair: row[32], // Col AG
                            statusD1: row[33], // Col AH
                            statusPending: row[34], // Col AI
                            statusSamples: row[35], // Col AJ
                            totalQuantity: parseNumber(row[36]), // Col AK
                            styleLink: row[37], // Col AL -> Style link

                            attrS: row[39], // Col AN
                            attrW: row[40], // Col AO
                            attrH: row[41], // Col AP
                            attrM: row[42], // Col AQ
                        };
                    });

                resolve(listings);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};
