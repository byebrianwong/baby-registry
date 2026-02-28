"use client";

import { useState } from "react";
import { ExternalLink, Trash2, Package, ShoppingBag, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { deleteRegistryItem, toggleParentPurchased } from "@/lib/actions/registry";

interface ItemCardProps {
  item: {
    id: string;
    title: string;
    external_url: string | null;
    image_url: string | null;
    price: number | null;
    quantity_needed: number;
    quantity_fulfilled: number;
    is_essential: boolean;
    is_parent_purchased: boolean;
    notes: string | null;
  };
  registryId: string;
  isOwner?: boolean;
}

export function ItemCard({ item, registryId, isOwner }: ItemCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const isFulfilled = item.quantity_fulfilled >= item.quantity_needed;
  const remaining = item.quantity_needed - item.quantity_fulfilled;

  const handleDelete = async () => {
    if (!confirm("Remove this item from your registry?")) return;
    setDeleting(true);
    await deleteRegistryItem(item.id, registryId);
  };

  const handleToggleParentPurchased = async () => {
    setToggling(true);
    await toggleParentPurchased(item.id, registryId, !item.is_parent_purchased);
    setToggling(false);
  };

  return (
    <Card
      className={
        isFulfilled && !item.is_parent_purchased
          ? "opacity-60"
          : item.is_parent_purchased
            ? "border-brand-600/30 bg-brand-600/5"
            : ""
      }
    >
      <CardContent className="flex gap-4 p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-tertiary">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="h-20 w-20 rounded-md object-cover"
            />
          ) : (
            <Package className="h-8 w-8 text-tertiary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium leading-tight">
                {item.title}
                {item.is_parent_purchased && (
                  <Badge variant="outline" className="ml-2 border-brand-600/50 text-brand-600">
                    You bought this
                  </Badge>
                )}
                {isFulfilled && !item.is_parent_purchased && (
                  <Badge variant="secondary" className="ml-2">
                    Fulfilled
                  </Badge>
                )}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                {item.is_essential && (
                  <Badge variant="default" className="text-xs">
                    Essential
                  </Badge>
                )}
                {item.price && (
                  <span className="text-sm text-tertiary">
                    ${item.price.toFixed(2)}
                  </span>
                )}
                {item.quantity_needed > 1 && !isFulfilled && (
                  <span className="text-sm text-tertiary">
                    {remaining} of {item.quantity_needed} needed
                  </span>
                )}
              </div>
            </div>
          </div>

          {item.notes && (
            <p className="mt-1 text-sm text-tertiary line-clamp-2">
              {item.notes}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            {item.external_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(item.external_url!, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                View
              </Button>
            )}
            {isOwner && !isFulfilled && !item.is_parent_purchased && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleParentPurchased}
                disabled={toggling}
              >
                <ShoppingBag className="mr-1 h-3 w-3" />
                {toggling ? "Saving..." : "I Bought This"}
              </Button>
            )}
            {isOwner && item.is_parent_purchased && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleParentPurchased}
                disabled={toggling}
              >
                <Undo2 className="mr-1 h-3 w-3" />
                Undo
              </Button>
            )}
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="text-error-primary hover:text-error-primary"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
