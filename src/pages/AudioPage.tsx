import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { audioPhrases, type AudioPhrase } from '../data/audioPhrases';

function AudioCard({ phrase }: { phrase: AudioPhrase }) {
  const [failed, setFailed] = useState(false);
  return <article className="audio-card" aria-labelledby={`phrase-${phrase.id}`}>
    <div className="audio-card-heading"><span className="audio-card-icon"><Volume2 size={20} /></span><div><span className="eyebrow">用餐溝通</span><h2 id={`phrase-${phrase.id}`}>{phrase.title}</h2></div></div>
    <p className="audio-japanese" lang="ja">{phrase.japanese}</p>
    <p className="audio-translation">{phrase.translation}</p>
    <p className="small muted">{phrase.voiceName} · AI 合成男聲（日文）</p>
    <audio controls preload="metadata" aria-label={`播放日文：${phrase.title}`} onError={() => setFailed(true)} src={`${import.meta.env.BASE_URL}${phrase.audioPath}`} />
    {failed && <p className="note" role="status">音檔暫時無法載入，請重新整理；也可以直接出示上方日文給店員看。</p>}
  </article>;
}

export function AudioPage() {
  return <>
    <header className="page-heading"><div className="heading-kicker"><span>WORDS FOR THE JOURNEY</span><span>JAPANESE PHRASES</span></div><h1>旅途語音<span className="heading-ja" lang="ja">伝えることば</span></h1><p>播放常用日文，或把卡片出示給店員看。</p></header>
    <section className="audio-cards" aria-label="日文語音卡片">{audioPhrases.map(phrase => <AudioCard key={phrase.id} phrase={phrase} />)}</section>
    <p className="small muted">先確認手機音量，按播放讓對方聽；也可以暫停後重播。</p>
  </>;
}
