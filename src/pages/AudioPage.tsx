import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { audioPhrases, type AudioPhrase } from '../data/audioPhrases';
import { NearbyStoresLink } from '../components/NearbyStoresLink';

function AudioCard({ phrase, onPlaybackStart }: { phrase: AudioPhrase; onPlaybackStart: (audio: HTMLAudioElement) => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pending, setPending] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const audio = audioRef.current;
    return () => { audio?.pause(); };
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || pending) return;
    if (!audio.paused) { audio.pause(); return; }
    setFailed(false);
    setPending(true);
    try {
      if (audio.error) audio.load();
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      // Pausing for another card or leaving the page can cancel a pending play.
      if (!(error instanceof DOMException && error.name === 'AbortError')) setFailed(true);
    }
    finally { setPending(false); }
  }
  const label = pending ? '載入中…' : playing ? '暫停播放' : failed ? '重試播放' : ended ? '再播放一次' : '播放日文';
  const PlaybackIcon = playing ? Pause : ended ? RotateCcw : Play;
  return <article className="audio-card" aria-labelledby={`phrase-${phrase.id}`}>
    <details className="audio-details">
      <summary className="audio-card-heading"><span className="audio-card-icon"><Volume2 size={20} /></span><div><h2 id={`phrase-${phrase.id}`}>{phrase.title}</h2></div><ChevronDown className="audio-chevron" size={18} aria-hidden="true" /></summary>
      <div className="audio-card-content"><p className="audio-japanese" lang="ja">{phrase.japanese}</p>
        <p className="audio-translation">{phrase.translation}</p>
        <p className="small muted">{phrase.voiceName} · AI 合成男聲（日文）</p></div>
    </details>
    <audio ref={audioRef} hidden preload="metadata" src={`${import.meta.env.BASE_URL}${phrase.audioPath}`}
      onPlay={event => { onPlaybackStart(event.currentTarget); setPlaying(true); setEnded(false); }} onPause={() => setPlaying(false)}
      onEnded={() => { setPlaying(false); setEnded(true); }}
      onError={() => { setFailed(true); setPending(false); setPlaying(false); }} />
    <button type="button" className="button audio-play-button" onClick={() => void togglePlayback()} disabled={pending} aria-pressed={playing} aria-label={`${label}：${phrase.title}`}><PlaybackIcon size={23} aria-hidden="true" />{label}</button>
    {failed && <p className="note" role="status">音檔暫時無法播放，請按重試；也可以展開卡片，出示日文給店員看。</p>}
  </article>;
}

export function AudioPage() {
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  function onPlaybackStart(audio: HTMLAudioElement) {
    if (activeAudio.current !== audio) activeAudio.current?.pause();
    activeAudio.current = audio;
  }
  return <>
    <header className="page-heading"><div className="page-title-row"><h1>求助</h1><NearbyStoresLink /></div><p>按播放讓店員聽，點標題查看日文與中文。</p></header>
    <section className="audio-cards" aria-label="日文語音卡片">{audioPhrases.map(phrase => <AudioCard key={phrase.id} phrase={phrase} onPlaybackStart={onPlaybackStart} />)}</section>
  </>;
}
