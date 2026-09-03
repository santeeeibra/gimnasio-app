"use client";

import { useEffect, useState } from "react";
import { FRASES_MOTIVADORAS } from "@/lib/frases-motivadoras";

/** Mezcla el mazo de frases (Fisher-Yates). */
function mazoMezclado(): string[] {
  const mazo = [...FRASES_MOTIVADORAS];
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  return mazo;
}

export function BannerMotivacional() {
  // Orden fijo en SSR + primer render (evita mismatch de hidratación); se
  // mezcla recién montado en el cliente.
  const [mazo, setMazo] = useState<string[]>(() => [...FRASES_MOTIVADORAS]);
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMazo(mazoMezclado());
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI((prev) => {
          const next = prev + 1;
          if (next >= mazo.length) {
            setMazo(mazoMezclado());
            return 0;
          }
          return next;
        });
        setVisible(true);
      }, 300);
    }, 7000);

    return () => clearInterval(id);
  }, [mazo.length]);

  return (
    <div className="rounded-[6px] border border-rule border-l-2 border-l-volt bg-paper-2 px-4 py-3">
      <p
        className={`text-sm text-ink-soft italic text-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {mazo[i]}
      </p>
    </div>
  );
}
