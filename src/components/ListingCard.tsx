import React, { useState } from 'react';
import { type Listing } from '../types';
import { ShoppingBag, Clock, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface ListingCardProps {
    listing: Listing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
    const [imageError, setImageError] = useState(false);

    const handleImageClick = () => {
        if (listing.photoLink) {
            window.open(listing.photoLink, '_blank');
        }
    };

    return (
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div
                className={`aspect-square relative bg-muted flex items-center justify-center overflow-hidden ${listing.photoLink && !imageError ? 'cursor-pointer' : ''}`}
                onClick={handleImageClick}
            >
                {listing.photoLink && !imageError ? (
                    <img
                        src={listing.photoLink}
                        alt={listing.itemCode}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                ) : (
                    <div className="text-muted-foreground flex flex-col items-center">
                        <ShoppingBag className="h-12 w-12 mb-2 opacity-20" />
                        <span className="text-xs">No Image</span>
                    </div>
                )}
            </div>

            <div className="p-4">
                {/* Quantity Pill - above item code */}
                {listing.totalQuantity > 0 && (
                    <div className="mb-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-base font-semibold px-4 py-1.5 rounded-full">
                            Qty: {listing.totalQuantity}
                        </span>
                    </div>
                )}

                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{listing.itemCode}</h3>
                    <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">
                        {listing.cost > 0 ? listing.cost.toLocaleString() : '-'}
                    </span>
                </div>

                {/* Status section - increased font size */}
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                    {listing.statusGood && <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> Good: {listing.statusGood}</div>}
                    {listing.statusRepair && <div className="flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Repair: {listing.statusRepair}</div>}
                    {listing.statusD1 && <div className="flex items-center gap-1"><HelpCircle className="h-4 w-4 text-blue-500" /> D1: {listing.statusD1}</div>}
                    {listing.statusPending && <div className="flex items-center gap-1"><Clock className="h-4 w-4 text-orange-500" /> Pen: {listing.statusPending}</div>}
                </div>

                {/* Attributes - increased font size */}
                <div className="flex flex-wrap gap-1 mt-2">
                    {listing.attrS && <span className="px-1.5 py-0.5 bg-accent rounded text-xs font-medium">S: {listing.attrS}</span>}
                    {listing.attrW && <span className="px-1.5 py-0.5 bg-accent rounded text-xs font-medium">W: {listing.attrW}</span>}
                    {listing.attrH && <span className="px-1.5 py-0.5 bg-accent rounded text-xs font-medium">H: {listing.attrH}</span>}
                    {listing.attrM && <span className="px-1.5 py-0.5 bg-accent rounded text-xs font-medium">M: {listing.attrM}</span>}
                </div>

                {/* Column J and L - last line */}
                <div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                    {listing.colJ && <div>Col J: {listing.colJ}</div>}
                    {listing.colL && <div>Col L: {listing.colL}</div>}
                </div>
            </div>
        </div>
    );
};
