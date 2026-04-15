import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import logoBrand from '@/assets/logo-brand.svg';

export type LoadingVariant = 'login' | 'logout' | 'auth' | 'success' | 'default';

interface VariantConfig {
  title: string;
  subtitle: string;
  steps: string[];
  isSuccess: boolean;
}

const VARIANT_CONFIG: Record<LoadingVariant, VariantConfig> = {
  login: {
    title: 'Iniciando sesión',
    subtitle: 'Verificando credenciales...',
    steps: ['Autenticando', 'Cargando módulos', 'Preparando sesión'],
    isSuccess: false,
  },
  logout: {
    title: 'Cerrando sesión',
    subtitle: 'Guardando datos de sesión...',
    steps: ['Cerrando módulos', 'Limpiando sesión', 'Redirigiendo'],
    isSuccess: false,
  },
  auth: {
    title: 'Verificando acceso',
    subtitle: 'Comprobando credenciales...',
    steps: ['Validando token', 'Cargando perfil', 'Configurando acceso'],
    isSuccess: false,
  },
  success: {
    title: '¡Bienvenido de vuelta!',
    subtitle: 'Redirigiendo al Dashboard...',
    steps: ['Autenticando', 'Cargando módulos', 'Preparando sesión'],
    isSuccess: true,
  },
  default: {
    title: 'Cargando sistema',
    subtitle: 'Por favor espera...',
    steps: ['Cargando datos', 'Preparando vista', 'Casi listo'],
    isSuccess: false,
  },
};

interface LoadingScreenProps {
  variant?: LoadingVariant;
  message?: string;
  className?: string;
}

export function LoadingScreen({ variant = 'default', message, className }: LoadingScreenProps) {
  const config = VARIANT_CONFIG[variant];
  const isSuccess = config.isSuccess;

  const [completedSteps, setCompletedSteps] = useState<number>(isSuccess ? 3 : 0);
  const [progress, setProgress] = useState<number>(isSuccess ? 100 : 0);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isSuccess) {
      setCompletedSteps(3);
      setProgress(100);
      return;
    }

    setCompletedSteps(0);
    setProgress(0);

    const step1Timer = setTimeout(() => setCompletedSteps(1), 700);
    const step2Timer = setTimeout(() => setCompletedSteps(2), 1600);

    let p = 0;
    progressRef.current = setInterval(() => {
      p += 1.4;
      if (p >= 65) {
        p = 65;
        if (progressRef.current) clearInterval(progressRef.current);
      }
      setProgress(Math.round(p));
    }, 30);

    return () => {
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isSuccess, variant]);

  const displayTitle = message || config.title;
  const accentColor = isSuccess ? '#22c55e' : '#3a71f7';
  const headerBg = isSuccess ? 'rgba(236,253,245,0.7)' : 'rgba(238,242,255,0.7)';
  const borderColor = isSuccess ? '#d1fae5' : '#e8eafb';
  const cardShadow = isSuccess
    ? '0px 4px 24px 0px rgba(34,197,94,0.1), 0px 20px 60px 0px rgba(18,18,19,0.22)'
    : '0px 4px 24px 0px rgba(58,113,247,0.1), 0px 20px 60px 0px rgba(18,18,19,0.22)';
  const connectorColor = isSuccess ? '#bbf7d0' : '#c5d3f8';
  const progressPx = (progress / 100) * 280;

  return (
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center', className)}
      style={{
        background: 'radial-gradient(ellipse at 35% 65%, #12235e 0%, #080f29 55%, #040918 100%)',
      }}
    >
      {/* Card */}
      <div
        className="relative overflow-hidden bg-white"
        style={{
          width: 360,
          height: 440,
          borderRadius: 20,
          border: `1px solid ${borderColor}`,
          boxShadow: cardShadow,
        }}
      >
        {/* Header tint */}
        <div
          className="absolute top-[-1px] left-[-1px]"
          style={{ width: 362, height: 153, background: headerBg }}
        />

        {/* Logo */}
        <div className="absolute top-[39px] left-0 right-0 flex justify-center">
          {isSuccess ? (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 12px rgba(34,197,94,0.1), 0 0 0 24px rgba(34,197,94,0.05)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 14px rgba(58,113,247,0.08), 0 0 0 28px rgba(58,113,247,0.04)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3a71f7 0%, #5a8df9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(58,113,247,0.35)',
                }}
              >
                <img src={logoBrand} alt="Convision" style={{ width: 38, height: 38 }} />
              </div>
            </div>
          )}
        </div>

        {/* Brand name */}
        <div className="absolute top-[127px] left-0 right-0 flex justify-center">
          <span style={{ fontWeight: 700, fontSize: 18, color: '#363f80', fontFamily: 'Inter, sans-serif' }}>
            con
          </span>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#748ced', fontFamily: 'Inter, sans-serif' }}>
            vision
          </span>
        </div>

        {/* Divider */}
        <div
          className="absolute top-[159px] left-[39px]"
          style={{ width: 280, height: 1, background: '#eef2ff' }}
        />

        {/* Title */}
        <div className="absolute top-[177px] left-0 right-0 flex justify-center px-6">
          <span
            style={{
              fontWeight: 600,
              fontSize: 16,
              color: '#0f0f12',
              fontFamily: 'Inter, sans-serif',
              textAlign: 'center',
            }}
          >
            {displayTitle}
          </span>
        </div>

        {/* Subtitle */}
        <div className="absolute top-[201px] left-0 right-0 flex justify-center px-6">
          <span
            style={{
              fontWeight: 400,
              fontSize: 12,
              color: '#7d7d87',
              fontFamily: 'Inter, sans-serif',
              textAlign: 'center',
            }}
          >
            {isSuccess ? 'Redirigiendo al Dashboard...' : config.subtitle}
          </span>
        </div>

        {/* Progress track */}
        <div
          className="absolute top-[239px] left-[39px]"
          style={{ width: 280, height: 5, borderRadius: 99, background: '#eef2ff' }}
        />

        {/* Progress fill */}
        <div
          className="absolute top-[239px] left-[39px]"
          style={{
            width: progressPx,
            height: 5,
            borderRadius: 99,
            background: accentColor,
            transition: 'width 0.3s ease-out',
          }}
        />

        {/* Progress percentage */}
        <div className="absolute top-[235px] right-[39px]">
          <span
            style={{ fontWeight: 500, fontSize: 11, color: accentColor, fontFamily: 'Inter, sans-serif' }}
          >
            {progress}%
          </span>
        </div>

        {/* Steps */}
        <div className="absolute top-[279px] left-[39px] flex flex-col">
          {config.steps.map((step, i) => {
            const isDone = i < completedSteps;
            return (
              <React.Fragment key={step}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 26 }}>
                  {/* Dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isDone ? accentColor : '#d5d5e0',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.4s ease',
                    }}
                  >
                    {isDone && (
                      <svg width="5" height="4" viewBox="0 0 5 4" fill="none">
                        <path
                          d="M0.8 2L2 3L4 1"
                          stroke="white"
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  {/* Label */}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isDone ? 500 : 400,
                      color: isDone ? '#0f0f12' : '#b0b0bc',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'color 0.4s ease',
                    }}
                  >
                    {step}
                  </span>
                </div>
                {i < config.steps.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      height: 16,
                      marginLeft: 3.5,
                      background: isDone ? connectorColor : '#e8e8f0',
                      transition: 'background 0.4s ease',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Bottom: pulsing dots or "Todo listo" */}
        <div
          className="absolute left-0 right-0 flex justify-center items-center"
          style={{ bottom: 55 }}
        >
          {isSuccess ? (
            <span
              style={{ fontSize: 13, fontWeight: 500, color: '#22c55e', fontFamily: 'Inter, sans-serif' }}
            >
              Todo listo
            </span>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {([10, 8, 6] as const).map((size, i) => (
                <div
                  key={i}
                  className="loading-dot"
                  style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: i === 0 ? '#3a71f7' : i === 1 ? '#8ba8f5' : '#c5d3f8',
                    animationDelay: `${i * 0.22}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer divider */}
        <div
          className="absolute left-[39px]"
          style={{ width: 280, height: 1, background: '#f0f0f5', bottom: 29 }}
        />

        {/* Footer text */}
        <div className="absolute left-0 right-0 flex justify-center" style={{ bottom: 14 }}>
          <span
            style={{ fontSize: 11, color: '#c0c0cc', fontFamily: 'Inter, sans-serif' }}
          >
            Convision · Sistema de gestión óptica
          </span>
        </div>
      </div>
    </div>
  );
}
