import React from 'react';
import { type Listing } from '../types';
import { ListingCard } from './ListingCard';
import { Loader2 } from 'lucide-react';

interface ListingGridProps {
    listings: Listing[];
    isLoading: boolean;
    error: Error | null;
    showAll: boolean;
}

export const ListingGrid: React.FC<ListingGridProps> = ({ listings, isLoading, error, showAll }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p>Loading items...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-destructive">
                <p className="font-semibold text-lg">Failed to load data</p>
                <p className="text-sm">{error.message}</p>
            </div>
        );
    }

    if (listings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
                <p>No items found in this category.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} showAll={showAll} />
            ))}
        </div>
    );
};
