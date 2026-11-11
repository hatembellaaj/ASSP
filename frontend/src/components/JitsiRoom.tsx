import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

interface JoinInfo {
  domain: string;
  room: string;
  jwt: string | null;
}

const scriptPromises: Record<string, Promise<void>> = {};

// Charge l'API Jitsi depuis le serveur Jitsi configuré côté backend
// (instance auto-hébergée ou meet.jit.si).
function loadScript(domain: string): Promise<void> {
  if (!scriptPromises[domain]) {
    scriptPromises[domain] = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        delete scriptPromises[domain];
        reject(new Error(`Impossible de joindre le serveur de visio (${domain})`));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromises[domain];
}

/**
 * Visio plein écran. `joinPath` est l'endpoint backend qui vérifie que
 * l'utilisateur participe bien à la séance / réunion et renvoie le domaine,
 * le nom de salle et le jeton d'accès (ex: `/sessions/<id>/join`).
 */
export default function JitsiRoom({
  joinPath,
  title,
  displayName,
  onClose,
}: {
  joinPath: string;
  title: string;
  displayName: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const info: JoinInfo = (await api.get(joinPath)).data;
        await loadScript(info.domain);
        if (cancelled || !containerRef.current) return;
        apiRef.current = new window.JitsiMeetExternalAPI(info.domain, {
          roomName: info.room,
          jwt: info.jwt || undefined,
          parentNode: containerRef.current,
          userInfo: { displayName },
          width: "100%",
          height: "100%",
          lang: "fr",
          configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true },
        });
        apiRef.current.addEventListener("readyToClose", () => onCloseRef.current());
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.response?.data?.error || e?.message || "Impossible de rejoindre la visio");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [joinPath, displayName]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-sm text-white">
        <span className="truncate">En direct — {title}</span>
        <button onClick={onClose} className="rounded bg-rose-600 px-3 py-1 hover:bg-rose-700">
          Quitter
        </button>
      </div>
      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        {(loading || error) && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-300">
            {error ? <span className="text-rose-300">{error}</span> : "Connexion à la visio…"}
          </div>
        )}
      </div>
    </div>
  );
}
