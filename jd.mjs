import { el } from './client_util.mjs';

/*

General:

  Made up of blocks, each separated by a blank line.
  Exception: multi-line blocks, inside some form of ;specifier[
     multi
     line
     text
 ].

Rules:

; Header
;; Header 2, and so on

- list item one
- list item another

1. list item one
1. list item two

Inline formatting:

  ;.[visit my link site.com/path]
  ;'[some bold text]
  ;/[some italic text]
  ;,[some underlined text]
  ;-[some struck through text]
  ;embed[url.com/image.jpg]

Multiline formatting:

  ;quote[
    my long multi line
    quote
  ]

  ;rust[
    fn my_rust() {
      code();
    }
  ]
*/

const RE = {
  HEADER: /^(?<num>;+) (?<text>.+)$/,
};

// Given some text, convert that text into an array of text blocks.
export function splitTextBlocks(text) {
  const lines = text.split('\n');
  const out = [];

  let i;
  for (i = 0; i < lines.length; i++) {
    // Ignore extra newlines outside of block; they get dropped for simplicity.
    if (!lines[i].trim().length) continue;

    // Headers are their own block, without a blank line.
    if (RE.HEADER.test(lines[i])) {
      out.push(lines[i]);
      continue;
    }

    // Plain old text - iterate till we hit a blank line, or the end.
    let text = lines[i];
    for (i++; i < lines.length; i++) {
      if (!lines[i].trim().length) break;
      text += '\n' + lines[i];
    }
    out.push(text);
  }

  return out;
}

export function renderText(text) {
  const blocks = splitTextBlocks(text);
  const out = [];
  for (const block of blocks) {
    let match;
    if (match = RE.HEADER.exec(block.trim())) {
      out.push(el(`h${match.groups.num.length}`, match.groups.text));
    } else {
      // Insert <br> between lines
      let lines = block.split('\n').flatMap((line, index) => index ? [el('br'), line] : line);
      out.push(el('p', ...lines));
    }
  }
  return out;
}
