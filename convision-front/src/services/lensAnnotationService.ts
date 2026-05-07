import api from '@/lib/axios';

export interface LensAnnotationData {
  lens_annotation_image: string | null;
  lens_annotation_image_url: string | null;
  lens_annotation_paths: CanvasPath[] | null;
}

export interface CanvasPath {
  type: 'pencil' | 'eraser';
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export interface SaveLensAnnotationInput {
  lens_annotation_image: string;
  lens_annotation_paths: CanvasPath[];
}

export const getLensAnnotation = (appointmentId: number) =>
  api.get<LensAnnotationData>(`/api/v1/appointments/${appointmentId}/lens-annotation`);

export const saveLensAnnotation = (appointmentId: number, data: SaveLensAnnotationInput) =>
  api.put<LensAnnotationData>(`/api/v1/appointments/${appointmentId}/lens-annotation`, data);
