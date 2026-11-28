import { site } from "./site";

/**
 * Реквизиты оператора персональных данных и версии документов.
 * Правовые тексты (/privacy, /consent) строятся из этих значений —
 * чтобы поменять документ, правьте здесь, а не в разметке.
 */
type Operator = {
  form: string;
  name: string;
  inn: string;
  ogrnip: string;
  address: string;
  email: string;
};

export const legal: {
  operator: Operator;
  policyVersion: string;
  policyUpdated: string;
  consentVersion: string;
} = {
  operator: {
    form: "ИП",
    name: "", // ФИО индивидуального предпринимателя
    inn: "",
    ogrnip: "",
    address: "",
    email: site.email,
  },
  policyVersion: "1.0",
  policyUpdated: "28.11.2026",
  consentVersion: "1.0",
};

/** «ИП Иванов Иван Иванович» либо нейтральная формулировка, пока реквизиты не заполнены. */
export function operatorTitle(): string {
  const { form, name } = legal.operator;
  return name ? `${form} ${name}` : "Индивидуальный предприниматель";
}

/** Только заполненные реквизиты — пустые строки в документ не попадают. */
export function operatorRequisites(): string[] {
  const { inn, ogrnip, address } = legal.operator;
  const out: string[] = [];
  if (inn) out.push(`ИНН ${inn}`);
  if (ogrnip) out.push(`ОГРНИП ${ogrnip}`);
  if (address) out.push(`адрес: ${address}`);
  return out;
}

/** Раздел «Оператор» в обоих документах. */
export function operatorBlock(): string[] {
  const src = operatorRequisites();
  return [operatorTitle(), ...src, `e-mail: ${legal.operator.email}`];
}
