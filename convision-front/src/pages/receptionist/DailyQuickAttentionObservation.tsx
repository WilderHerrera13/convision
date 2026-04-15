import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { NOTE_MAX } from '@/pages/receptionist/dailyQuickAttentionHelpers';

type Props = {
  note: string;
  onNoteChange: (v: string) => void;
};

/**
 * Cuerpo del paso 3 (observación). Los botones van en el pie de página del flujo.
 */
const DailyQuickAttentionObservation: React.FC<Props> = ({ note, onNoteChange }) => (
  <div className="space-y-2.5">
    <Textarea
      id="quick-attention-note"
      rows={5}
      maxLength={NOTE_MAX}
      placeholder="Ej.: cliente interesado en progresivos, consulta por garantía, derivación a especialista..."
      value={note}
      onChange={(e) => onNoteChange(e.target.value)}
      aria-describedby="quick-attention-note-hint"
      className="min-h-[120px] resize-y rounded-lg border-[#dcdce0] text-[13px]"
    />
    <div className="flex items-baseline justify-between gap-2">
      <p id="quick-attention-note-hint" className="text-[12px] text-[#7d7d87]">
        Opcional: describe el contexto en una o dos frases, o finaliza sin observación.
      </p>
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
        {note.length}/{NOTE_MAX}
      </span>
    </div>
  </div>
);

export default DailyQuickAttentionObservation;
