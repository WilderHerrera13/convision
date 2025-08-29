import React from 'react';
import { Box, Typography, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { SectionProps, FieldDefinition } from '../types';

const CompanionResponsibleSection: React.FC<SectionProps> = ({ form, serverErrors, renderField }) => {
  // Get form values
  const formValues = form.watch();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Acompañante and Responsable Section */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Acompañante Subsection */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Checkbox
              checked={formValues.acompañante_no_aplica || false}
              onChange={(e) => form.setValue('acompañante_no_aplica', e.target.checked)}
              sx={{ 
                '&.Mui-checked': {
                  color: '#3b82f6'
                }
              }}
            />
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 500, 
              fontSize: '0.9rem',
              color: '#475569'
            }}>
              Acompañante
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Nombre
                </Typography>
                <TextField
                  value={formValues.acompañante_nombre || ''}
                  onChange={(e) => form.setValue('acompañante_nombre', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Nombre completo"
                  disabled={!formValues.acompañante_no_aplica}
                  error={!!serverErrors?.acompañante_nombre}
                  helperText={serverErrors?.acompañante_nombre}
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Celular
                </Typography>
                <TextField
                  value={formValues.acompañante_telefono || ''}
                  onChange={(e) => form.setValue('acompañante_telefono', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Número de celular"
                  disabled={!formValues.acompañante_no_aplica}
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Dirección
                </Typography>
                <TextField
                  value={(formValues as any).acompañante_direccion || ''}
                  onChange={(e) => form.setValue('acompañante_direccion' as any, e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Dirección completa"
                  disabled={!formValues.acompañante_no_aplica}
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Parentesco
                </Typography>
                <TextField
                  value={(formValues as any).acompañante_parentesco || ''}
                  onChange={(e) => form.setValue('acompañante_parentesco' as any, e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Parentesco"
                  disabled={!formValues.acompañante_no_aplica}
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Vertical Divider Line */}
        <Box sx={{ 
          width: '2px', 
          backgroundColor: '#e2e8f0',
          minHeight: '200px',
          alignSelf: 'stretch'
        }} />

        {/* Responsable Subsection */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Checkbox
              checked={formValues.responsable_no_aplica || false}
              onChange={(e) => form.setValue('responsable_no_aplica', e.target.checked)}
              sx={{ 
                '&.Mui-checked': {
                  color: '#3b82f6'
                }
              }}
            />
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 500, 
              fontSize: '0.9rem',
              color: '#475569'
            }}>
              Responsable
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Nombre
                </Typography>
                <TextField
                  value={formValues.responsable_nombre || ''}
                  onChange={(e) => form.setValue('responsable_nombre', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Nombre completo"
                  disabled={!formValues.responsable_no_aplica}
                  error={!!serverErrors?.responsable_nombre}
                  helperText={serverErrors?.responsable_nombre}
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Celular
                </Typography>
                <TextField
                  value={formValues.responsable_telefono || ''}
                  onChange={(e) => form.setValue('responsable_telefono', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Número de celular"
                  disabled={!formValues.responsable_no_aplica}
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Dirección
                </Typography>
                <TextField
                  value={(formValues as any).responsable_direccion || ''}
                  onChange={(e) => form.setValue('responsable_direccion' as any, e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Dirección completa"
                  disabled={!formValues.responsable_no_aplica}
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Parentesco
                </Typography>
                <TextField
                  value={(formValues as any).responsable_parentesco || ''}
                  onChange={(e) => form.setValue('responsable_parentesco' as any, e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Parentesco"
                  disabled={!formValues.responsable_no_aplica}
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Divider Line */}
      <Box sx={{ 
        height: '2px', 
        backgroundColor: '#e2e8f0',
        width: '100%'
      }} />

      {/* Motivo Consulta and Antecedentes Section - side by side */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Motivo Consulta Section - 1/4 width */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 3,
            color: '#1e293b'
          }}>
            Motivo Consulta
          </Typography>
          <TextField
            value={formValues.motivo_consulta || ''}
            onChange={(e) => form.setValue('motivo_consulta', e.target.value)}
            multiline
            rows={4}
            fullWidth
            placeholder="Describa el motivo de la consulta"
            sx={{ bgcolor: 'white' }}
          />
        </Box>

        {/* Vertical Divider Line */}
        <Box sx={{ 
          width: '2px', 
          backgroundColor: '#e2e8f0',
          minHeight: '200px',
          alignSelf: 'stretch'
        }} />

        {/* Antecedentes Section - 3/4 width */}
        <Box sx={{ flex: 3 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 3,
            color: '#1e293b'
          }}>
            Antecedentes
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 600, 
                color: '#374151',
                position: 'absolute',
                top: -8,
                left: 12,
                backgroundColor: 'white',
                px: 1,
                zIndex: 1,
                fontSize: '0.75rem'
              }}>
                Familiares
              </Typography>
              <TextField
                value={formValues.antecedentes_familiares || ''}
                onChange={(e) => form.setValue('antecedentes_familiares', e.target.value)}
                multiline
                rows={4}
                fullWidth
                placeholder="Antecedentes familiares"
                sx={{ bgcolor: 'white' }}
              />
            </Box>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 600, 
                color: '#374151',
                position: 'absolute',
                top: -8,
                left: 12,
                backgroundColor: 'white',
                px: 1,
                zIndex: 1,
                fontSize: '0.75rem'
              }}>
                Personales
              </Typography>
              <TextField
                value={formValues.antecedentes_personales || ''}
                onChange={(e) => form.setValue('antecedentes_personales', e.target.value)}
                multiline
                rows={4}
                fullWidth
                placeholder="Antecedentes personales"
                sx={{ bgcolor: 'white' }}
              />
            </Box>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 600, 
                color: '#374151',
                position: 'absolute',
                top: -8,
                left: 12,
                backgroundColor: 'white',
                px: 1,
                zIndex: 1,
                fontSize: '0.75rem'
              }}>
                Laborales
              </Typography>
              <TextField
                value={formValues.antecedentes_laborales || ''}
                onChange={(e) => form.setValue('antecedentes_laborales', e.target.value)}
                multiline
                rows={4}
                fullWidth
                placeholder="Antecedentes laborales"
                sx={{ bgcolor: 'white' }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CompanionResponsibleSection; 