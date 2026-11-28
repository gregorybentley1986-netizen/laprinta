import type { CardProduct } from "./cards";

/** One position of the order — shared by the PDF and the Excel renderers. */
export type SpecLine = { qty: number; product: CardProduct };
