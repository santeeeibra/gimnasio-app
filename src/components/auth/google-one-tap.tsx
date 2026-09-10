"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { asegurarPerfilGoogleAction } from "@/app/login/actions";
import { hapticoImpactoMedio, hapticoError } from "@/lib/ui/hapticos";

interface GoogleOneTapProps {
  onSuccess?: () => void;
  onError?: (mensaje: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => Promise<void>;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (
            notification?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              isDismissedMoment: () => boolean;
              getNotDisplayedReason: () => string;
              getSkippedReason: () => string;
              getDismissedReason: () => string;
            }) => void,
          ) => void;
        };
      };
    };
  }
}

export function GoogleOneTap({ onSuccess, onError }: GoogleOneTapProps) {
  const router = useRouter();
  const inicializado = useRef(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const inicializarGoogleOneTap = () => {
    if (!clientId || !window.google?.accounts?.id || inicializado.current) {
      return;
    }

    inicializado.current = true;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response: { credential: string }) => {
          try {
            hapticoImpactoMedio();
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
            });

            if (error) {
              hapticoError();
              onError?.(error.message);
              return;
            }

            // Asegurar perfil ligero y resolver ruta de destino
            const resultado = await asegurarPerfilGoogleAction();
            if (resultado.error) {
              hapticoError();
              onError?.(resultado.error);
              return;
            }

            onSuccess?.();
            router.push(resultado.destino || "/");
            router.refresh();
          } catch (err: unknown) {
            hapticoError();
            onError?.(
              err instanceof Error ? err.message : "Error al procesar Google One Tap",
            );
          }
        },
      });

      window.google.accounts.id.prompt();
    } catch {
      // Si el navegador bloquea cookies de terceros o FedCM, no bloquea el login tradicional
    }
  };

  useEffect(() => {
    if (window.google?.accounts?.id) {
      inicializarGoogleOneTap();
    }
  }, [clientId]);

  if (!clientId) {
    return null;
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={inicializarGoogleOneTap}
    />
  );
}
