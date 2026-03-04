"use client";

import { useState } from "react";
import { ExternalLink, Package, ShoppingBag, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { UsedConditionTag } from "@/components/ui/used-condition-tag";
import { toggleParentPurchased } from "@/lib/actions/registry";
import { EditItemDialog } from "@/components/edit-item-dialog";

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
    is_open_to_used: boolean;
    minimum_condition: string | null;
    notes: string | null;
    category_id: string | null;
  };
  registryId: string;
  isOwner?: boolean;
  categories?: { id: string; name: string }[];
  zipCode?: string;
}

export function ItemCard({ item, registryId, isOwner, categories = [], zipCode }: ItemCardProps) {
  const [toggling, setToggling] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isFulfilled = item.quantity_fulfilled >= item.quantity_needed;
  const remaining = item.quantity_needed - item.quantity_fulfilled;

  const handleToggleParentPurchased = async () => {
    setToggling(true);
    await toggleParentPurchased(item.id, registryId, !item.is_parent_purchased);
    setToggling(false);
  };

  return (
    <>
    <Card
      className={`py-0 gap-0 rounded-xl ${
        isOwner ? "cursor-pointer transition-shadow hover:shadow-md" : ""
      } ${
        isFulfilled && !item.is_parent_purchased
          ? "opacity-60"
          : item.is_parent_purchased
            ? "bg-secondary"
            : ""
      }`}
      onClick={isOwner ? () => setEditOpen(true) : undefined}
    >
      <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
        <div className="flex gap-3">
          <div className="flex size-[106px] shrink-0 items-center justify-center rounded-[10px] bg-tertiary">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="size-[106px] rounded-[10px] object-cover"
              />
            ) : (
              <Package className="h-10 w-10 text-tertiary" />
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{item.title}</h3>
              <div className="shrink-0 h-6">
                {item.is_parent_purchased && (
                  <Tag variant="purchased-by-you">Purchased by you</Tag>
                )}
                {isFulfilled && !item.is_parent_purchased && (
                  <Tag variant="gifted">Gifted</Tag>
                )}
              </div>
            </div>

            {(item.is_essential || item.is_open_to_used) && (
              <div className="flex gap-2.5 flex-wrap">
                {item.is_essential && (
                  <Tag variant="most-wanted">Most wanted</Tag>
                )}
                {item.is_open_to_used && (
                  <UsedConditionTag condition={item.minimum_condition} />
                )}
              </div>
            )}

            <div className="flex items-center gap-2.5">
              {item.price && (
                <span className="text-sm font-semibold">
                  ${item.price.toFixed(2)}
                </span>
              )}
              <span className="text-xs">
                {remaining} of {item.quantity_needed} still needed
              </span>
            </div>

            {item.notes && (
              <p className="text-sm whitespace-pre-line line-clamp-2">{item.notes}</p>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {item.external_url && (
              <Button
                variant="outline"
                onClick={() => window.open(item.external_url!, '_blank', 'noopener,noreferrer')}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  Shop
                </span>
              </Button>
            )}
            {!isFulfilled && !item.is_parent_purchased && (
              <Button
                variant="outline"
                onClick={handleToggleParentPurchased}
                disabled={toggling}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 shrink-0" />
                  {toggling ? "Saving..." : "Mark as bought by parent"}
                </span>
              </Button>
            )}
            {item.is_parent_purchased && (
              <Button
                variant="outline"
                onClick={handleToggleParentPurchased}
                disabled={toggling}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Undo2 className="h-4 w-4 shrink-0" />
                  Mark as unpurchased
                </span>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    {isOwner && (
      <EditItemDialog
        item={item}
        registryId={registryId}
        categories={categories}
        zipCode={zipCode}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    )}
    </>
  );
}
