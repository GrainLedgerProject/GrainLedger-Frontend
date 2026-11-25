export const fieldPaths = {
  farmers: "/field/farmers/new",
  plots: "/field/plots/new",
  seasons: "/field/crop-seasons",
  declarations: "/field/declarations/new",
  receipts: "/field/receipts/new",
  receipt: "/field/receipts/:receiptId",
  sourceLot: "/field/source-lots/:sourceLotId",
  samples: "/field/samples/new",
  sync: "/field/sync",
} as const;

export const receiptPath = (id: string) => fieldPaths.receipt.replace(":receiptId", encodeURIComponent(id));
export const sourceLotPath = (id: string) => fieldPaths.sourceLot.replace(":sourceLotId", encodeURIComponent(id));
