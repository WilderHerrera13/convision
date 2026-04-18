import type { Supplier } from '@/services/supplierService';
import type { SupplierFormInput } from './supplierSchemas';

const COMMERCIAL_PREFIX = '--- Comercial ---\n';

export const emptySupplierFormValues: SupplierFormInput = {
  name: '',
  nit: '',
  personType: 'juridica',
  companySubtype: '',
  country: 'Colombia',
  city: '',
  paymentMethod: '',
  paymentTermDays: '',
  discountPercent: '',
  creditLimit: '',
  notes: '',
  contactName: '',
  jobTitle: '',
  department: '',
  phone: '',
  phoneAlt: '',
  email: '',
  website: '',
  address: '',
};


function serializeCommercial(data: SupplierFormInput): string {
  const lines: string[] = [];
  if (data.companySubtype.trim()) lines.push(`Forma societaria: ${data.companySubtype.trim()}`);
  lines.push(`Forma de pago: ${data.paymentMethod.trim()}`);
  lines.push(`Plazo de pago (días): ${data.paymentTermDays.trim()}`);
  if (data.discountPercent?.trim()) lines.push(`Descuento acordado (%): ${data.discountPercent.trim()}`);
  if (data.creditLimit?.trim()) lines.push(`Límite de crédito (COP): ${data.creditLimit.trim()}`);
  if (data.phoneAlt?.trim()) lines.push(`Teléfono alternativo: ${data.phoneAlt.trim()}`);
  return lines.join('\n');
}

export function buildNotesFromForm(data: SupplierFormInput): string {
  const commercial = serializeCommercial(data);
  const user = data.notes?.trim() ?? '';
  if (!user) return `${COMMERCIAL_PREFIX}${commercial}`;
  return `${COMMERCIAL_PREFIX}${commercial}\n\n${user}`;
}

function parseCommercialLines(block: string): Partial<
  Pick<
    SupplierFormInput,
    'companySubtype' | 'paymentMethod' | 'paymentTermDays' | 'discountPercent' | 'creditLimit' | 'phoneAlt'
  >
> {
  const out: Partial<SupplierFormInput> = {};
  for (const line of block.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k === 'Forma societaria') out.companySubtype = v;
    if (k === 'Forma de pago') out.paymentMethod = v;
    if (k === 'Plazo de pago (días)') out.paymentTermDays = v;
    if (k === 'Descuento acordado (%)') out.discountPercent = v;
    if (k === 'Límite de crédito (COP)') out.creditLimit = v;
    if (k === 'Teléfono alternativo') out.phoneAlt = v;
  }
  return out;
}

export function parseNotesToFormFields(notes?: string | null): {
  userNotes: string;
  commercial: Partial<
    Pick<
      SupplierFormInput,
      'companySubtype' | 'paymentMethod' | 'paymentTermDays' | 'discountPercent' | 'creditLimit' | 'phoneAlt'
    >
  >;
} {
  if (!notes?.startsWith(COMMERCIAL_PREFIX)) {
    return { userNotes: notes?.trim() ?? '', commercial: {} };
  }
  const rest = notes.slice(COMMERCIAL_PREFIX.length);
  const sep = rest.indexOf('\n\n');
  const commercialRaw = sep === -1 ? rest : rest.slice(0, sep);
  const userNotes = sep === -1 ? '' : rest.slice(sep + 2).trim();
  return { userNotes, commercial: parseCommercialLines(commercialRaw) };
}

export function supplierToFormValues(s: Supplier): SupplierFormInput {
  const { userNotes, commercial } = parseNotesToFormFields(s.notes);
  const rp = (s.responsible_person ?? '').split(' — ');
  return {
    name: s.name,
    nit: s.nit ?? '',
    personType: s.person_type ?? 'juridica',
    companySubtype: commercial.companySubtype ?? '',
    country: s.country ?? '',
    city: (s.city ?? '') as string,
    paymentMethod: commercial.paymentMethod ?? '',
    paymentTermDays: commercial.paymentTermDays ?? '',
    discountPercent: commercial.discountPercent ?? '',
    creditLimit: commercial.creditLimit ?? '',
    notes: userNotes,
    contactName: s.legal_representative ?? '',
    jobTitle: rp[0]?.trim() ?? '',
    department: rp[1]?.trim() ?? '',
    phone: s.phone ?? '',
    phoneAlt: commercial.phoneAlt ?? '',
    email: s.email ?? '',
    website: s.website ?? '',
    address: s.address ?? '',
  };
}

export function formValuesToCreatePayload(data: SupplierFormInput) {
  const responsible = [data.jobTitle?.trim(), data.department?.trim()].filter(Boolean).join(' — ') || undefined;

  return {
    name: data.name.trim(),
    nit: data.nit.trim(),
    person_type: data.personType,
    legal_representative: data.contactName.trim(),
    responsible_person: responsible,
    country: data.country.trim(),
    city: data.city.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    website: data.website?.trim() || undefined,
    address: data.address.trim(),
    notes: buildNotesFromForm(data),
  };
}
