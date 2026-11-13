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
    id: 'vegetarian-inquiry',
    title: '詢問素食餐點',
    japanese: 'すみません。私はベジタリアンです。ベジタリアン向けの料理はありますか。',
    translation: '不好意思，我吃素，請問有適合素食者的餐點嗎？',
    voiceName: 'Benji',
    audioPath: 'audio/vegetarian-inquiry-ja.mp3',
  },
  {
    id: 'lacto-vegetarian',
    title: '補充奶素條件',
    japanese: '乳製品は大丈夫ですが、肉・魚・卵は食べられません。かつおだしや魚醤、その他の動物性のだしも避けています。',
    translation: '乳製品可以，但不能吃肉、魚、蛋，也避免柴魚高湯、魚露和其他動物性高湯。',
    voiceName: 'Benji',
    audioPath: 'audio/lacto-vegetarian-details-ja.mp3',
  },
];
