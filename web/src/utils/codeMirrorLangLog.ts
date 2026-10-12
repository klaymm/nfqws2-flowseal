import { LanguageSupport, StreamLanguage } from '@codemirror/language';

const logLanguage = StreamLanguage.define<null>({
  name: 'log',
  startState: () => null,
  token(stream) {
    if (stream.sol()) {
      let style: string | null = null;
      if (stream.match(/^== /)) {
        style = 'heading';
      } else if (stream.match(/^\s*! /)) {
        style = 'keyword';
      } else if (stream.match(/^(Ошибка|Error):/)) {
        style = 'invalid';
      } else if (stream.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} /)) {
        style = 'comment';
      }
      if (style) {
        stream.skipToEnd();
        return style;
      }
    }
    if (stream.eatSpace()) {
      return null;
    }
    if (stream.match(/^https?:\/\/[^\s,]+/)) {
      return 'link';
    }
    if (stream.match(/^\d+([.:]\d+)*(?=[\s,)]|$)/)) {
      return 'number';
    }
    if (!stream.match(/^[^\s,]+/)) {
      stream.next();
    }
    return null;
  },
});

export function codeMirrorLangLog() {
  return new LanguageSupport(logLanguage);
}
