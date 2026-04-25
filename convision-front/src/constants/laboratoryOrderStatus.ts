export const LABORATORY_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  crm_registered: 'Registro CRM',
  in_process: 'En proceso',
  in_progress: 'En proceso',
  sent_to_lab: 'Enviado a laboratorio',
  in_transit: 'En tránsito',
  received_from_lab: 'Recibido del laboratorio',
  returned_to_lab: 'Retornado al laboratorio',
  in_quality: 'En calidad',
  quality_approved: 'Calidad aprobada',
  ready_for_delivery: 'Listo para entregar',
  portfolio: 'Portafolio',
  delivered: 'Entregado',
  in_collection: 'En cartera',
  collection_follow_up: 'Seguimiento / Escalamiento',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

export const LABORATORY_ORDER_STATUS_BADGE_CLASS: Record<string, string> = {
  in_quality: 'bg-[#fff6e3] text-[#b57218]',
  quality_approved: 'bg-[#f0faf5] text-[#0a6b4a]',
  ready_for_delivery: 'bg-[#ebf5ef] text-[#228b52]',
  sent_to_lab: 'bg-[#ffeeed] text-[#b82626]',
};

export type LabOrderStatus =
  | 'pending'
  | 'crm_registered'
  | 'in_process'
  | 'in_progress'
  | 'sent_to_lab'
  | 'in_transit'
  | 'received_from_lab'
  | 'returned_to_lab'
  | 'in_quality'
  | 'quality_approved'
  | 'ready_for_delivery'
  | 'portfolio'
  | 'delivered'
  | 'in_collection'
  | 'collection_follow_up'
  | 'closed'
  | 'cancelled';

export const LAB_ORDER_STATUS_LABELS: Record<LabOrderStatus, string> = {
  pending: 'Pendiente',
  crm_registered: 'Registro CRM',
  in_process: 'En proceso',
  in_progress: 'En proceso',
  sent_to_lab: 'Enviado a laboratorio',
  in_transit: 'En tránsito',
  received_from_lab: 'Recibido del laboratorio',
  returned_to_lab: 'Retornado al laboratorio',
  in_quality: 'En calidad',
  quality_approved: 'Calidad aprobada',
  ready_for_delivery: 'Listo para entregar',
  portfolio: 'Portafolio',
  delivered: 'Entregado',
  in_collection: 'En cartera',
  collection_follow_up: 'Seguimiento / Escalamiento',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

export interface LabOrderStatusToken {
  bg: string;
  text: string;
  dot: string;
}

export const LAB_ORDER_STATUS_TOKENS: Record<LabOrderStatus, LabOrderStatusToken> = {
  pending: { bg: '#fff6e3', text: '#b57218', dot: '#b57218' },
  crm_registered: { bg: '#f0f4ff', text: '#3730a3', dot: '#3730a3' },
  in_process: { bg: '#eff1ff', text: '#3a71f7', dot: '#3a71f7' },
  in_progress: { bg: '#eff1ff', text: '#3a71f7', dot: '#3a71f7' },
  sent_to_lab: { bg: '#fff6e3', text: '#b57218', dot: '#b57218' },
  in_transit: { bg: '#e8f4f8', text: '#0e7490', dot: '#0e7490' },
  received_from_lab: { bg: '#e8f4f8', text: '#0e7490', dot: '#0e7490' },
  returned_to_lab: { bg: '#ffeeed', text: '#b82626', dot: '#b82626' },
  in_quality: { bg: '#eef2ff', text: '#4338ca', dot: '#4338ca' },
  quality_approved: { bg: '#f0faf5', text: '#0a6b4a', dot: '#0a6b4a' },
  ready_for_delivery: { bg: '#e5f6ef', text: '#0f8f64', dot: '#0f8f64' },
  portfolio: { bg: '#f1f2f6', text: '#5d5d67', dot: '#5d5d67' },
  delivered: { bg: '#ebf5ef', text: '#0f8f64', dot: '#0f8f64' },
  in_collection: { bg: '#fff0e6', text: '#c2410c', dot: '#c2410c' },
  collection_follow_up: { bg: '#ffeeed', text: '#b82626', dot: '#b82626' },
  closed: { bg: '#f1f2f6', text: '#374151', dot: '#374151' },
  cancelled: { bg: '#ffeeed', text: '#b82626', dot: '#b82626' },
};

export type LabOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export const LAB_ORDER_PRIORITY_LABELS: Record<LabOrderPriority, string> = {
  low: 'Baja',
  normal: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const LAB_ORDER_PRIORITY_TOKENS: Record<LabOrderPriority, LabOrderStatusToken> = {
  low: { bg: '#f1f2f6', text: '#5d5d67', dot: '#5d5d67' },
  normal: { bg: '#f1f2f6', text: '#5d5d67', dot: '#5d5d67' },
  high: { bg: '#fff6e3', text: '#b57218', dot: '#b57218' },
  urgent: { bg: '#ffeeed', text: '#b82626', dot: '#b82626' },
};

export const LAB_ORDER_MAIN_FLOW: LabOrderStatus[] = [
  'pending',
  'crm_registered',
  'in_process',
  'sent_to_lab',
  'in_transit',
  'received_from_lab',
  'in_quality',
  'quality_approved',
  'ready_for_delivery',
  'delivered',
  'closed',
];
