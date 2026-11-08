import { readDb } from "@/lib/db";
import { ProductForm } from "../ProductForm";
import { sectionOptions } from "../data";

export const metadata = { title: "Новый товар" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const db = await readDb();
  const sections = sectionOptions(db);
  const { section } = await searchParams;
  const sectionId = sections.find((s) => s.id === section)?.id ?? sections.find((s) => s.depth > 1)?.id ?? sections[0]?.id ?? "";
  return (
    <ProductForm
      sections={sections}
      initial={{
        name: "",
        slug: "",
        sku: "",
        tagline: "",
        description: "",
        sectionId,
        priceRub: null,
        priceFrom: false,
        inStock: true,
        status: "draft",
        loadGrams: null,
        material: "",
        colors: [],
        specs: [{ label: "Тип", value: "" }, { label: "Грузоподъёмность", value: "" }, { label: "Длина", value: "" }, { label: "Корпус", value: "" }],
        marketplace: {},
        seo: { title: "", description: "" },
      }}
    />
  );
}
