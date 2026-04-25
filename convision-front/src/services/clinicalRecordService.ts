import api from '@/lib/axios';

export interface AnamnesisInput {
  reason_for_visit: string;
  systemic_background?: string;
  ocular_background?: string;
  family_background?: string;
  pharmacological_background?: string;
  current_correction_type?: string;
  current_correction_time?: string;
}

export interface VisualExamInput {
  av_sc_od?: string;
  av_sc_oi?: string;
  av_near_sc_od?: string;
  av_near_sc_oi?: string;
  av_cc_od?: string;
  av_cc_oi?: string;
  av_near_cc_od?: string;
  av_near_cc_oi?: string;
  autoref_sph_od?: number;
  autoref_cyl_od?: number;
  autoref_axis_od?: number;
  autoref_sph_oi?: number;
  autoref_cyl_oi?: number;
  autoref_axis_oi?: number;
  subj_sph_od?: number;
  subj_cyl_od?: number;
  subj_axis_od?: number;
  subj_av_od?: string;
  subj_sph_oi?: number;
  subj_cyl_oi?: number;
  subj_axis_oi?: number;
  subj_av_oi?: string;
  addition?: number;
  kero_k1_od?: number;
  kero_k2_od?: number;
  kero_axis_od?: number;
  kero_k1_oi?: number;
  kero_k2_oi?: number;
  kero_axis_oi?: number;
  iop_method?: string;
  iop_od?: number;
  iop_oi?: number;
  biomi_cornea_od?: string;
  biomi_cornea_oi?: string;
  biomi_lens_od?: string;
  biomi_lens_oi?: string;
  biomi_conj_od?: string;
  biomi_conj_oi?: string;
  biomi_ac_od?: string;
  biomi_ac_oi?: string;
  fundus_vitreous_od?: string;
  fundus_vitreous_oi?: string;
  fundus_disc_od?: string;
  fundus_disc_oi?: string;
  fundus_macula_od?: string;
  fundus_macula_oi?: string;
  fundus_periph_od?: string;
  fundus_periph_oi?: string;
  ocular_motility?: string;
}

export interface DiagnosisInput {
  primary_code: string;
  primary_description: string;
  diagnosis_type: 1 | 2 | 3;
  related_1_code?: string;
  related_1_desc?: string;
  related_2_code?: string;
  related_2_desc?: string;
  related_3_code?: string;
  related_3_desc?: string;
  optical_correction_plan?: string;
  patient_education?: string;
  next_control_date?: string;
  next_control_reason?: string;
  requires_referral?: boolean;
  referral_notes?: string;
  cups?: string;
}

export interface PrescriptionInput {
  sph_od?: number;
  cyl_od?: number;
  axis_od?: number;
  avcc_od?: string;
  add_od?: number;
  dp_od?: number;
  sph_oi?: number;
  cyl_oi?: number;
  axis_oi?: number;
  avcc_oi?: string;
  add_oi?: number;
  dp_oi?: number;
  lens_type?: string;
  lens_material?: string;
  lens_use?: string;
  mounting_height?: number;
  treatments?: string[];
  validity_months?: number;
  professional_tp?: string;
}

export interface ClinicalRecord {
  id: number;
  appointment_id: number;
  patient_id: number;
  specialist_id: number;
  record_type: 'new_consultation' | 'follow_up';
  status: 'in_progress' | 'completed' | 'signed';
  cups?: string;
  anamnesis?: AnamnesisInput & { id: number };
  visual_exam?: VisualExamInput & { id: number };
  diagnosis?: DiagnosisInput & { id: number };
  prescription?: PrescriptionInput & { id: number; valid_until?: string };
}

export const createClinicalRecord = (appointmentId: number, recordType: 'new_consultation' | 'follow_up') =>
  api.post<ClinicalRecord>(`/api/v1/appointments/${appointmentId}/clinical-record`, { record_type: recordType });

export const getClinicalRecord = (appointmentId: number) =>
  api.get<ClinicalRecord>(`/api/v1/appointments/${appointmentId}/clinical-record`);

export const upsertAnamnesis = (appointmentId: number, data: AnamnesisInput) =>
  api.put(`/api/v1/appointments/${appointmentId}/clinical-record/anamnesis`, data);

export const upsertVisualExam = (appointmentId: number, data: VisualExamInput) =>
  api.put(`/api/v1/appointments/${appointmentId}/clinical-record/visual-exam`, data);

export const upsertDiagnosis = (appointmentId: number, data: DiagnosisInput) =>
  api.put(`/api/v1/appointments/${appointmentId}/clinical-record/diagnosis`, data);

export const upsertPrescription = (appointmentId: number, data: PrescriptionInput) =>
  api.put(`/api/v1/appointments/${appointmentId}/clinical-record/prescription`, data);

export const signClinicalRecord = (appointmentId: number, professionalTp: string) =>
  api.post(`/api/v1/appointments/${appointmentId}/clinical-record/sign`, { professional_tp: professionalTp });
