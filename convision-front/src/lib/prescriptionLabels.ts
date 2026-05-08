export const TREATMENTS = [
  { key: 'antirreflejo', label: 'Antirreflejo' },
  { key: 'fotocromatico', label: 'Fotocromático' },
  { key: 'filtro_luz_azul', label: 'Filtro luz azul' },
  { key: 'endurecido', label: 'Endurecido' },
  { key: 'hidrofobico', label: 'Hidrofóbico' },
] as const;

export const LENS_TYPES = [
  { key: 'monofocal', label: 'Monofocal' },
  { key: 'bifocal', label: 'Bifocal' },
  { key: 'progresivo', label: 'Progresivo' },
  { key: 'ocupacional', label: 'Ocupacional' },
] as const;

export const LENS_MATERIALS = [
  { key: 'policarbonato', label: 'Policarbonato' },
  { key: 'cr39', label: 'CR-39' },
  { key: 'trivex', label: 'Trivex' },
  { key: 'alto_indice', label: 'Alto índice' },
] as const;

export const LENS_USES = [
  { key: 'permanente', label: 'Permanente' },
  { key: 'lectura', label: 'Lectura' },
  { key: 'intermitente', label: 'Intermitente' },
] as const;

type Entry = { key: string; label: string };

const toMap = (list: readonly Entry[]) =>
  Object.fromEntries(list.map((e) => [e.key, e.label]));

const TREATMENT_MAP = toMap(TREATMENTS);
const LENS_TYPE_MAP = toMap(LENS_TYPES);
const LENS_MATERIAL_MAP = toMap(LENS_MATERIALS);
const LENS_USE_MAP = toMap(LENS_USES);

const humanize = (slug: string) =>
  slug
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const treatmentLabel = (slug?: string | null) =>
  (slug && TREATMENT_MAP[slug]) || (slug ? humanize(slug) : '');

export const lensTypeLabel = (slug?: string | null) =>
  (slug && LENS_TYPE_MAP[slug]) || (slug ? humanize(slug) : '');

export const lensMaterialLabel = (slug?: string | null) =>
  (slug && LENS_MATERIAL_MAP[slug]) || (slug ? humanize(slug) : '');

export const lensUseLabel = (slug?: string | null) =>
  (slug && LENS_USE_MAP[slug]) || (slug ? humanize(slug) : '');

export const formatTreatmentList = (slugs?: readonly (string | null | undefined)[] | null) =>
  (slugs ?? []).filter(Boolean).map((s) => treatmentLabel(s as string)).join(', ');
