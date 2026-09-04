import { useEffect, useRef } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

const JITSI_DOMAIN = "meet.jit.si";

function loadScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger Jitsi Meet"));
    document.body.appendChild(script);
  });
}

export default function JitsiRoom({
  room,
  displayName,
  onClose,
}: {
  room: string;
  displayName: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: room,
          parentNode: containerRef.current,
          userInfo: { displayName },
          width: "100%",
          height: "100%",
          configOverwrite: { prejoinPageEnabled: false },
        });
        apiRef.current.addEventListener("readyToClose", onClose);
      })
      .catch((e) => console.error(e));

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-sm text-white">
        <span>Séance en direct — {room}</span>
        <button onClick={onClose} className="rounded bg-rose-600 px-3 py-1 hover:bg-rose-700">
          Quitter
        </button>
      </div>
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
