import { useEffect, useRef, useState } from "react";

import {
  MAX_CALL_AUDIO_BYTES,
  MAX_CALL_TRANSCRIPT_BYTES,
  transcriptionResponseSchema,
} from "../../engine/calls/transcription";
import { postAnalysisJson } from "../lib/api";
import { downloadText } from "../lib/download";

interface Props {
  transcript: string;
  fileName?: string;
  disabled: boolean;
  isAnalyzing: boolean;
  noAnswer: boolean;
  onChange(text: string, fileName?: string, durationSec?: number): void;
  onAnalyze(): void;
  onError(message: string): void;
  onBusyChange(busy: boolean): void;
}

function readAudio(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result.includes(",")) {
        reject(new Error("Audio failu neizdevās nolasīt."));
        return;
      }
      resolve(reader.result.slice(reader.result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Audio failu neizdevās nolasīt."));
    reader.readAsDataURL(file);
  });
}

export function CallUpload({
  transcript,
  fileName,
  disabled,
  isAnalyzing,
  noAnswer,
  onChange,
  onAnalyze,
  onError,
  onBusyChange,
}: Props) {
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [transcribed, setTranscribed] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState<"reading" | "transcribing" | null>(null);
  const [dragging, setDragging] = useState(false);
  const busyRef = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const locked = disabled || busy !== null;
  const pendingAudio = audio !== null && !transcribed;

  useEffect(() => {
    if (!audio) {
      setAudioUrl("");
      return;
    }
    const url = URL.createObjectURL(audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);
  useEffect(() => () => controller.current?.abort(), []);

  function setWorking(value: "reading" | "transcribing" | null) {
    busyRef.current = value !== null;
    setBusy(value);
    onBusyChange(value !== null);
  }

  async function readFile(file: File): Promise<void> {
    if (disabled || busyRef.current) return;
    onError("");
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "txt" && extension !== "mp3") {
      onError("Izvēlieties TXT vai MP3 failu ar sarunu.");
      return;
    }
    if (file.size > (extension === "mp3" ? MAX_CALL_AUDIO_BYTES : MAX_CALL_TRANSCRIPT_BYTES)) {
      onError(
        extension === "mp3"
          ? "MP3 fails pārsniedz 3,2 MB ierobežojumu."
          : "Transkripta fails pārsniedz 100 KB ierobežojumu.",
      );
      return;
    }
    if (file.size === 0) {
      onError(extension === "mp3" ? "MP3 fails ir tukšs." : "TXT failā nav sarunas teksta.");
      return;
    }
    if (extension === "mp3") {
      setAudio(file);
      setTranscribed(false);
      setWarnings([]);
      return;
    }
    setWorking("reading");
    try {
      const text = await file.text();
      if (!text.trim()) {
        onError("TXT failā nav sarunas teksta.");
        return;
      }
      setAudio(null);
      setTranscribed(false);
      setWarnings([]);
      onChange(text, file.name);
    } catch {
      onError("Transkripta failu neizdevās nolasīt.");
    } finally {
      setWorking(null);
    }
  }

  async function transcribe(): Promise<void> {
    if (!audio || disabled || busyRef.current) return;
    onError("");
    setWorking("transcribing");
    const operation = new AbortController();
    controller.current = operation;
    try {
      const encoded = await readAudio(audio);
      const payload = await postAnalysisJson(
        `${import.meta.env.BASE_URL}api/transcribe-call`,
        { audio: encoded },
        (input, init) => fetch(input, { ...init, signal: operation.signal }),
      );
      if (operation.signal.aborted) return;
      const result = transcriptionResponseSchema.safeParse(payload);
      if (!result.success)
        throw new Error("Serveris neatgrieza derīgu transkriptu. Mēģiniet vēlreiz.");
      onChange(
        result.data.transcript,
        audio.name.replace(/\.mp3$/i, ".txt"),
        result.data.durationSec,
      );
      setWarnings([...new Set(result.data.warnings)]);
      setTranscribed(true);
    } catch (error) {
      if (!operation.signal.aborted)
        onError(error instanceof Error ? error.message : "Audio atšifrēšana neizdevās.");
    } finally {
      if (!operation.signal.aborted) setWorking(null);
    }
  }

  return (
    <section
      aria-label="Transkripta faila augšupielāde"
      aria-busy={busy !== null || isAnalyzing}
      className={`mt-5 rounded-xl border-2 border-dashed p-4 transition ${dragging ? "border-emerald-600 bg-emerald-50" : "border-slate-300 bg-slate-50/50"}`}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = locked ? "none" : "copy";
        setDragging(!locked);
      }}
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setDragging(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        setDragging(false);
        if (locked) return;
        if (event.dataTransfer.files.length !== 1) {
          onError("Izvēlieties vienu TXT vai MP3 failu.");
          return;
        }
        void readFile(event.dataTransfer.files[0]);
      }}
    >
      <p className="text-sm font-semibold text-emerald-800">
        {dragging
          ? "Atlaidiet TXT vai MP3 failu šeit"
          : "Ievelciet TXT vai MP3 failu šeit vai izvēlieties to ar pogu"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-emerald-700">
          Izvēlēties TXT vai MP3 failu
          <input
            className="sr-only"
            type="file"
            accept="text/plain,.txt,audio/mpeg,.mp3"
            disabled={locked}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
              event.target.value = "";
            }}
          />
        </label>
        {(audio?.name ?? fileName) && (
          <span className="break-all text-sm text-slate-600">{audio?.name ?? fileName}</span>
        )}
        {audio && (
          <button
            type="button"
            disabled={locked}
            className="text-sm font-semibold text-slate-600 underline disabled:opacity-50"
            onClick={() => {
              setAudio(null);
              setTranscribed(false);
              setWarnings([]);
              onError("");
            }}
          >
            Noņemt MP3
          </button>
        )}
      </div>
      {audioUrl && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          {/* biome-ignore lint/a11y/useMediaCaption: The editable transcript is provided directly below this audio. */}
          <audio
            controls
            preload="metadata"
            src={audioUrl}
            aria-label="Izvēlētais zvana ieraksts"
            className="w-full"
          />
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {pendingAudio
              ? "Spiediet “Atšifrēt MP3”. Pēc tam pārbaudiet iegūto tekstu un analizējiet sarunu."
              : "Audio ir atšifrēts. Pārbaudiet runātājus, skaitļus un neskaidrās vietas pirms analīzes."}
          </p>
        </div>
      )}
      {warnings.length > 0 && (
        <ul className="mt-3 list-disc rounded-lg bg-amber-50 p-3 pl-7 text-sm text-amber-950">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="call-transcript">
        Zvana transkripts
      </label>
      <textarea
        id="call-transcript"
        className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 p-4 font-mono text-sm leading-6 disabled:bg-slate-100"
        disabled={locked || pendingAudio}
        placeholder="Darbinieks: Labdien!...\nKlients: Labdien!..."
        value={transcript}
        onChange={(event) => onChange(event.target.value)}
      />
      {pendingAudio && transcript && (
        <p className="mt-2 text-sm text-slate-600">
          Iepriekšējais teksts saglabāts. To aizstās tikai veiksmīgi atšifrēts jaunais ieraksts.
        </p>
      )}
      <aside className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
        <strong>Datu robeža.</strong> Atšifrēšanai MP3 tiek nosūtīts ārējam OpenRouter modelim;
        analīzei — pārbaudītais teksts un zvana laiks. Izmantojiet tikai sintētiskus vai
        anonimizētus datus. Lietotne ierakstus neglabā. Parauga diena modelim netiek sūtīta.
      </aside>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {transcript.trim() && !pendingAudio && (
          <button
            type="button"
            disabled={locked}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
            onClick={() =>
              downloadText(`${transcript.trim()}\n`, fileName ?? "zvana-transkripts.txt")
            }
          >
            Lejupielādēt transkriptu TXT
          </button>
        )}
        <span role="status" className="text-sm text-slate-600">
          {busy === "transcribing"
            ? "Atšifrē audio — tas var aizņemt aptuveni minūti..."
            : busy === "reading"
              ? "Nolasa failu..."
              : ""}
        </span>
        <button
          type="button"
          className="ml-auto rounded-lg bg-emerald-700 px-5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isAnalyzing || busy !== null}
          onClick={() => {
            if (noAnswer || !pendingAudio) onAnalyze();
            else void transcribe();
          }}
        >
          {busy === "transcribing"
            ? "Atšifrē..."
            : busy === "reading"
              ? "Nolasa failu..."
              : isAnalyzing
                ? "Analizē..."
                : noAnswer
                  ? "Pievienot mēģinājumu"
                  : pendingAudio
                    ? "Atšifrēt MP3"
                    : "Analizēt transkriptu"}
        </button>
      </div>
    </section>
  );
}
