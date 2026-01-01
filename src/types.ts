export interface Listing {
    id: string;
    photoLink: string;
    itemCode: string;
    cost: number;
    statusGood: string;
    statusRepair: string;
    statusD1: string;
    statusPending: string;
    statusSamples: string;
    totalQuantity: number;
    lastDate: string;
    attrS: string;
    attrW: string;
    attrH: string;
    attrM: string;
}

export type MainCategory = 'MW' | 'LW' | 'CW';
export type SubCategory = 'JACKET' | 'SHORTS' | 'TOPS' | 'PANTS' | 'SKIRT' | 'DRESS';

export interface CategoryConfig {
    id: SubCategory;
    name: string;
    gid: string;
}

export interface MainCategoryConfig {
    id: MainCategory;
    name: string;
    sheetId: string;
    enabled: boolean;
    subcategories: CategoryConfig[];
}
