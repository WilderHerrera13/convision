import React from 'react';
import { Box } from '@mui/material';
import { SectionProps, FieldDefinition } from '../types';

const ConsultationInfoSection: React.FC<SectionProps> = ({ form, serverErrors, renderField }) => {
  const fields: FieldDefinition[] = [
    { 
      name: "ultimo_control_visual", 
      label: "Último Control Visual", 
      type: "text", 
      required: true,
      placeholder: "1 año y 2 meses"
    },
    { 
      name: "tipo_consulta", 
      label: "Tipo de Consulta", 
      type: "select",
      options: [
        { value: "CONSULTA DE PRIMERA VEZ POR OPTOMETRIA", label: "CONSULTA DE PRIMERA VEZ POR OPTOMETRIA" },
        { value: "CONSULTA DE CONTROL O DE SEGUIMIENTO POR OPTOMETRIA", label: "CONSULTA DE CONTROL O DE SEGUIMIENTO POR OPTOMETRIA" },
        { value: "EVALUACION ORTOPTICA", label: "EVALUACION ORTOPTICA" },
        { value: "TERAPIA ORTOPTICA", label: "TERAPIA ORTOPTICA" },
        { value: "TERAPIA PLEOPTICA", label: "TERAPIA PLEOPTICA" }
      ]
    },
    { 
      name: "tipo_atencion", 
      label: "Tipo de Atención", 
      type: "select",
      options: [
        { value: "INTRAMURAL", label: "INTRAMURAL" },
        { value: "EXTRAMURAL UNIDAD MÓVIL", label: "EXTRAMURAL UNIDAD MÓVIL" },
        { value: "EXTRAMURAL DOMICILIARIA", label: "EXTRAMURAL DOMICILIARIA" },
        { value: "EXTRAMURAL JORNADA DE SALUD", label: "EXTRAMURAL JORNADA DE SALUD" },
        { value: "TELEMEDICINA INTERACTIVA", label: "TELEMEDICINA INTERACTIVA" },
        { value: "TELEMEDICINA NO INTERACTIVA", label: "TELEMEDICINA NO INTERACTIVA" },
        { value: "TELEMEDICINA TELEXPERTICIA", label: "TELEMEDICINA TELEXPERTICIA" },
        { value: "TELEMEDICINA TELEMONITOREO", label: "TELEMEDICINA TELEMONITOREO" }
      ]
    },
    { 
      name: "causa_externa", 
      label: "Causa Externa", 
      type: "select",
      options: [
        { value: "ACCIDENTE DE TRABAJO", label: "ACCIDENTE DE TRABAJO" },
        { value: "ACCIDENTE EN EL HOGAR", label: "ACCIDENTE EN EL HOGAR" },
        { value: "ACCIDENTE DE TRÁNSITO DE ORIGEN COMÚN", label: "ACCIDENTE DE TRÁNSITO DE ORIGEN COMÚN" },
        { value: "ACCIDENTE DE TRÁNSITO DE ORIGEN LABORAL", label: "ACCIDENTE DE TRÁNSITO DE ORIGEN LABORAL" },
        { value: "ACCIDENTE EN EL ENTORNO EDUCATIVO", label: "ACCIDENTE EN EL ENTORNO EDUCATIVO" },
        { value: "OTRO TIPO DE ACCIDENTE", label: "OTRO TIPO DE ACCIDENTE" },
        { value: "EVENTO CATASTRÓFICO DE ORIGEN NATURAL", label: "EVENTO CATASTRÓFICO DE ORIGEN NATURAL" },
        { value: "LESIÓN POR AGRESIÓN", label: "LESIÓN POR AGRESIÓN" },
        { value: "LESIÓN AUTO INFLIGIDA", label: "LESIÓN AUTO INFLIGIDA" },
        { value: "SOSPECHA DE VIOLENCIA FÍSICA", label: "SOSPECHA DE VIOLENCIA FÍSICA" },
        { value: "SOSPECHA DE VIOLENCIA PSICOLÓGICA", label: "SOSPECHA DE VIOLENCIA PSICOLÓGICA" },
        { value: "SOSPECHA DE VIOLENCIA SEXUAL", label: "SOSPECHA DE VIOLENCIA SEXUAL" },
        { value: "SOSPECHA DE NEGLIGENCIA Y ABANDONO", label: "SOSPECHA DE NEGLIGENCIA Y ABANDONO" },
        { value: "IVE RELACIONADO CON PELIGRO A LA SALUD O VIDA DE LA MUJER", label: "IVE RELACIONADO CON PELIGRO A LA SALUD O VIDA DE LA MUJER" },
        { value: "IVE POR MALFORMACIÓN CONGÉNITA INCOMPATIBLE CON LA VIDA", label: "IVE POR MALFORMACIÓN CONGÉNITA INCOMPATIBLE CON LA VIDA" },
        { value: "IVE POR VIOLENCIA SEXUAL, INCESTO O POR INSEMINACIÓN ARTIFICIAL O TRANSFERENCIA DE ÓVULO FECUN", label: "IVE POR VIOLENCIA SEXUAL, INCESTO O POR INSEMINACIÓN ARTIFICIAL O TRANSFERENCIA DE ÓVULO FECUN" },
        { value: "EVENTO ADVERSO EN SALUD", label: "EVENTO ADVERSO EN SALUD" },
        { value: "ENFERMEDAD GENERAL", label: "ENFERMEDAD GENERAL" },
        { value: "ENFERMEDAD LABORAL", label: "ENFERMEDAD LABORAL" },
        { value: "PROMOCIÓN Y MANTENIMIENTO DE LA SALUD - INTERVENCIONES INDIVIDUALES", label: "PROMOCIÓN Y MANTENIMIENTO DE LA SALUD - INTERVENCIONES INDIVIDUALES" },
        { value: "INTERVENCIÓN COLECTIVA", label: "INTERVENCIÓN COLECTIVA" },
        { value: "ATENCIÓN DE POBLACIÓN MATERNO PERINATAL", label: "ATENCIÓN DE POBLACIÓN MATERNO PERINATAL" },
        { value: "RIESGO AMBIENTAL", label: "RIESGO AMBIENTAL" },
        { value: "OTROS EVENTOS CATASTRÓFICOS", label: "OTROS EVENTOS CATASTRÓFICOS" },
        { value: "ACCIDENTE DE MINA ANTIPERSONAL - MAP", label: "ACCIDENTE DE MINA ANTIPERSONAL - MAP" },
        { value: "ACCIDENTE DE ARTEFACTO EXPLOSIVO IMPROVISADO - AEI", label: "ACCIDENTE DE ARTEFACTO EXPLOSIVO IMPROVISADO - AEI" },
        { value: "ACCIDENTE DE MUNICIÓN SIN EXPLOTAR- MUSE", label: "ACCIDENTE DE MUNICIÓN SIN EXPLOTAR- MUSE" },
        { value: "OTRA VÍCTIMA DE CONFLICTO ARMADO COLOMBIANO", label: "OTRA VÍCTIMA DE CONFLICTO ARMADO COLOMBIANO" },
        { value: "DETECCIÓN DE ALTERACIONES DE AGUDEZA VISUAL", label: "DETECCIÓN DE ALTERACIONES DE AGUDEZA VISUAL" }
      ]
    },
    { 
      name: "finalidad_consulta", 
      label: "Finalidad de la Consulta", 
      type: "select",
      options: [
        { value: "VALORACION INTEGRAL PARA LA PROMOCION Y MANTENIMIENTO", label: "VALORACION INTEGRAL PARA LA PROMOCION Y MANTENIMIENTO" },
        { value: "DETECCION TEMPRANA DE ENFERMEDAD GENERAL", label: "DETECCION TEMPRANA DE ENFERMEDAD GENERAL" },
        { value: "DETECCION TEMPRANA DE ENFERMEDAD LABORAL", label: "DETECCION TEMPRANA DE ENFERMEDAD LABORAL" },
        { value: "PROTECCION ESPECIFICA", label: "PROTECCION ESPECIFICA" },
        { value: "DIAGNOSTICO", label: "DIAGNOSTICO" },
        { value: "TRATAMIENTO", label: "TRATAMIENTO" },
        { value: "REHABILITACION", label: "REHABILITACION" },
        { value: "PALIACION", label: "PALIACION" },
        { value: "PROMOCION DE LA CAPACIDAD DE LA AGENCIA Y CUIDADO DE LA SALUD", label: "PROMOCION DE LA CAPACIDAD DE LA AGENCIA Y CUIDADO DE LA SALUD" },
        { value: "INTERVENCION COLECTIVA", label: "INTERVENCION COLECTIVA" },
        { value: "MODIFICACION DE LA ESTETICA CORPORAL (FINES ESTETICOS)", label: "MODIFICACION DE LA ESTETICA CORPORAL (FINES ESTETICOS)" },
        { value: "OTRA", label: "OTRA" }
      ]
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
      {/* Left column with select fields */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {fields.filter(field => field.name !== 'ultimo_control_visual').map(field => {
          const renderedField = renderField(field);
          if (!renderedField) return null;
          
          return (
            <Box key={field.name}>
              {renderedField}
            </Box>
          );
        })}
      </Box>
      
      {/* Right column with Último Control Visual */}
      <Box sx={{ flex: '0 0 300px', minWidth: { xs: '100%', md: '300px' } }}>
        {fields.filter(field => field.name === 'ultimo_control_visual').map(field => {
          const renderedField = renderField(field);
          if (!renderedField) return null;
          
          return (
            <Box key={field.name}>
              {renderedField}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ConsultationInfoSection; 