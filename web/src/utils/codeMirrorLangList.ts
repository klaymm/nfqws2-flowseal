import { LanguageSupport, StreamLanguage } from '@codemirror/language';

const listLanguage = StreamLanguage.define<null>({
  name: 'list',
  startState: () => null,
  token(stream) {
    const comment = stream.sol() && stream.match(/^\s*#/);
    stream.skipToEnd();
    return comment ? 'comment' : null;
  },
  languageData: {
    commentTokens: { line: '#' },
  },
});

export function codeMirrorLangList() {
  return new LanguageSupport(listLanguage);
}
