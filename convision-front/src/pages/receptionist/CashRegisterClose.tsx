import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { CheckCircle2, ChevronRight, Loader2, Lock } from 'lucide-react';
import CashCloseStepper, { type CashCloseStepIndex } from '@/components/cashClose/CashCloseStepper';
import AdvisorCashCloseSteps from '@/components/cashClose/AdvisorCashCloseSteps';
import { useCashClose } from '@/hooks/useCashClose';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-[#f0f0f3] text-[#6b6b78] border-[#d0d0d8]' },
  submitted: { label: 'Enviado', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  approved: { label: 'Aprobado', className: 'bg-green-50 text-green-700 border-green-300' },
};

const CashRegisterClose: React.FC = () => {
  const [closeDate] = useState(() => startOfDay(new Date()));
  const [step, setStep] = useState<CashCloseStepIndex>(0);

  const {
    paymentMethods,
    denominations,
    existingClose,
    isLoading,
    isSaving,
    handlePaymentChange,
    handleDenominationChange,
    handleSave,
    handleSubmit,
    totalCounted,
    totalCashCounted,
    isReadOnly,
  } = useCashClose(closeDate);

  const currentStatus = existingClose?.status ?? 'draft';
  const statusConfig = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.draft;
  const showSubmittedBanner = isReadOnly && currentStatus === 'submitted';
  const showApprovedBanner = isReadOnly && currentStatus === 'approved';

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f5f5f6]">
      <header className="shrink-0 border-b border-border bg-background px-6 py-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-foreground sm:text-lg">Cierre de Caja</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Registra el cierre financiero del día
            </p>
          </div>
          <div
            className="w-full max-w-[180px] sm:w-48"
            title="El cierre de caja solo puede realizarse para el día actual."
          >
            <DatePicker
              value={closeDate}
              onChange={() => {}}
              placeholder="Fecha de cierre"
              disabled
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Solo día actual</p>
          </div>
        </div>
      </header>

      <div className="shrink-0 border-b border-border bg-background px-6 py-4">
        <CashCloseStepper activeStep={step} className="border-0 bg-transparent p-0 shadow-none" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
        {showSubmittedBanner && (
          <Alert
            className="border-[#b57218] bg-[#fff6e3] text-[#7a4a0f]"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="h-4 w-4 text-[#b57218]" />
            <AlertTitle className="text-[#b57218]">Cierre enviado</AlertTitle>
            <AlertDescription className="text-[#7a4a0f]">
              Este cierre fue enviado y está pendiente de aprobación. Puede revisar el historial en{' '}
              <Link
                to="/receptionist/cash-close-history"
                className="font-semibold text-[#3a71f7] underline"
              >
                Historial de cierres
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}

        {showApprovedBanner && (
          <Alert
            className="border-green-300 bg-green-50 text-green-800"
            role="status"
            aria-live="polite"
          >
            <Lock className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700">Cierre aprobado — solo lectura</AlertTitle>
            <AlertDescription className="text-green-800">
              El cierre de caja de hoy ya fue aprobado por administración. No es posible modificarlo.
              Puede consultar el detalle en{' '}
              <Link
                to="/receptionist/cash-close-history"
                className="font-semibold text-[#3a71f7] underline"
              >
                Historial de cierres
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Cargando datos del cierre…</p>
          </div>
        ) : (
          <AdvisorCashCloseSteps
            step={step}
            paymentMethods={paymentMethods}
            denominations={denominations}
            handlePaymentChange={handlePaymentChange}
            handleDenominationChange={handleDenominationChange}
            isReadOnly={isReadOnly}
            totalCounted={totalCounted}
            totalCashCounted={totalCashCounted}
            currentStatus={currentStatus}
          />
        )}
      </div>

      {!isLoading && !isReadOnly && (
        <div className="sticky bottom-0 z-30 border-t border-border bg-background/95 px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              {step === 0 && (
                <>
                  <Button type="button" variant="outline" onClick={() => void handleSave()} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Guardar borrador
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#3a71f7] text-white hover:bg-[#2d5dcc]"
                    onClick={() => setStep(1)}
                  >
                    Conteo de efectivo
                    <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#228b52] text-white hover:bg-[#1a6e3f]"
                    onClick={() => void handleSubmit()}
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Enviar cierre
                  </Button>
                </>
              )}
              {step === 1 && (
                <>
                  <Button type="button" variant="outline" onClick={() => setStep(0)}>
                    Atrás
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void handleSave()} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Guardar borrador
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#3a71f7] text-white hover:bg-[#2d5dcc]"
                    onClick={() => setStep(2)}
                  >
                    Ver resumen
                    <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Atrás
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void handleSave()} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Guardar borrador
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#228b52] text-white hover:bg-[#1a6e3f]"
                    onClick={() => void handleSubmit()}
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Enviar cierre
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CashRegisterClose;
