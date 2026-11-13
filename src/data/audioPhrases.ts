export interface AudioPhrase {
  id: string;
  title: string;
  japanese: string;
  translation: string;
  audioPath: string;
  voiceName: string;
}

export const audioPhrases: AudioPhrase[] = [
  {
    id: 'lacto-vegetarian',
    title: '向店員說明飲食限制',
    japanese: 'すみません。私はラクト・ベジタリアンです。乳製品は大丈夫ですが、肉・魚・卵は食べられません。かつおだしや魚醤、その他の動物性のだしも避けています。私が食べられる料理を教えていただけますか。',
    translation: '不好意思，我吃奶素。乳製品可以，但不能吃肉、魚、蛋，也避免柴魚高湯、魚露和其他動物性高湯。請問有哪些餐點適合我吃？',
    voiceName: 'Arthur',
    audioPath: 'audio/lacto-vegetarian-arthur-ja.mp3',
  },
];
