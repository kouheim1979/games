// All sizes of a skewer share the same ink drawing, from the order slip to the grill.
"use strict";

const KINDS = {
  momo:     { name: "もも",     price: 540, p: ["momo", "momo", "momo"] },
  negima:   { name: "ねぎま",   price: 600, p: ["momo", "negi", "momo"] },
  tsukune:  { name: "つくね",   price: 660, p: ["tsukune", "tsukune", "tsukune"] },
  shiitake: { name: "しいたけ", price: 480, p: ["shiitake", "shiitake", "shiitake"] },
  reba:     { name: "レバー",   price: 570, p: ["reba", "reba", "reba"] },
  uzura:    { name: "うずら",   price: 510, p: ["uzura", "uzura", "uzura"] },
  hatsu:    { name: "ハツ",     price: 570, p: ["hatsu", "hatsu", "hatsu"] },
  shishito: { name: "ししとう", price: 450, p: ["shishito", "shishito", "shishito"] },
  tebasaki: { name: "手羽先",   price: 690, p: ["tebasaki", "tebasaki", "tebasaki"] },
};
const KIND_ORDER = Object.keys(KINDS);
const pieceArt = {
  momo: `<path d="M7 15Q7 9 15 8l10-3q5-2 11 0l10 1q7 0 8 7l1 10q2 7-5 10-8 1-13 3-5 2-10 0l-13-1q-8 0-9-7z" fill="url(#glaze)"/>
    <path d="M8 26q7 7 17 6t16-3 12-3q-2 5-7 6l-12 3q-5 2-12-1l-8-1q-5-1-6-7" fill="#bb561d" stroke="none"/>
    <path d="M13 18q1-5 6-6m4-1 3-1" fill="none" stroke="#fff0b2" stroke-width="3.4"/>
    <path d="m29 25 5-9m3 9 6-10m2 6 3-5" fill="none" stroke="#70311d" stroke-width="3.4"/>`,
  negi: `<path d="M11 5q3-2 6-1l31 3q7 1 8 11t-5 15q-3 2-7 1l-32-4q-7-1-7-13 0-8 6-12z" fill="url(#leek)"/>
    <path d="M13 6q7 1 7 13t-8 11q-6-1-7-13 0-9 8-11z" fill="#a6bb35"/>
    <path d="M12 11q4 0 4 8t-3 7q-4-1-4-8 0-5 3-7z" fill="#778826" stroke="none"/>
    <path d="m22 11 23 2m-21 11 22 2" stroke="#fff0a0" stroke-width="2.4"/>
    <path d="m27 17 4-5m4 7 5-6m3 6 4-5" fill="none" stroke="#695721" stroke-width="2.8"/>`,
  tsukune: `<path d="M9 17Q10 8 19 6q7-5 15-3 8 0 12 5 8 3 9 12 1 7-6 12-6 6-17 5-13 2-21-6-7-7-2-14z" fill="url(#meatball)"/>
    <path d="M15 16q2-6 10-7m4 0 3 0" fill="none" stroke="#ffd592" stroke-width="3.4"/>
    <path d="m20 26 3 2m9-8 3 1m6 6 3-2m1-9 2 1" fill="none" stroke="#743b25" stroke-width="3"/>`,
  shiitake: `<path d="m24 22 13 1-1 11q-1 5-7 4l-5-1q-3-1-2-4z" fill="#e8bf80"/>
    <path d="M4 25Q5 15 15 8 24 1 34 3 48 4 55 17q6 10-1 13-8 2-16-1-13-3-23 0-10 3-11-4z" fill="url(#cap)"/>
    <path d="M9 25q9-4 19-3t24 4" stroke="#d29a61" stroke-width="2" fill="none"/>
    <path d="m17 11 8 3-5 5 11-4 8 4-4-6 8-5-11 3-7-5 2 6z" fill="#ffe5b1" stroke="none"/>`,
  reba: `<path d="M5 23q-1-8 8-13 7-5 16-6 6-1 8 5 2 5 7 4 11-2 12 6 2 7-5 12-5 4-15 2-5-1-9 2-5 4-12 1Q6 33 5 23z" fill="url(#liver)"/>
    <path d="M12 19q3-6 12-8m12 16q5-3 11-2" fill="none" stroke="#dc8a91" stroke-width="3"/>
    <path d="M12 29q6 5 13 2" fill="none" stroke="#6d3445" stroke-width="2.7"/>`,
  uzura: `<path d="M13 26Q10 16 20 8q7-7 15-5 9 1 14 13 5 12-3 18-7 6-20 3-10-2-13-11z" fill="url(#egg)"/>
    <path d="M19 19q2-6 8-9" stroke="#fffdf2" stroke-width="3.7" fill="none"/>
    <path d="m38 12 2 1m-7 13 1 1m7-4 2 1m-20 4 1 1" stroke="#c09960" stroke-width="2.6"/>`,
  hatsu: `<path d="M7 16Q5 7 15 5q9-3 16 5 6-9 15-7 10 2 8 13-2 8-10 14l-12 8q-5 1-12-5Q8 25 7 16z" fill="url(#heart-meat)"/>
    <path d="M13 14q0-5 7-5m18 0 5-2" stroke="#ffc3a3" stroke-width="3" fill="none"/>
    <path d="m34 29 7-9m1 5 4-5" stroke="#8f3c36" stroke-width="2.7"/>`,
  shishito: `<path d="M8 28q3-6 10-8 4-2 6-8 3-7 12-6 9 0 12 8 3 9-6 14-4 2-9 1-5 6-13 4-5 1-10 3-5 1-2-8z" fill="url(#pepper)"/>
    <path d="M37 8q4-5 10-3l6-3 2 3-7 5-3 5-4-4z" fill="#738538"/>
    <path d="M12 29q5-4 12-5 5-1 7-7m-3-2 4-4" fill="none" stroke="#bdcd63" stroke-width="3"/>
    <path d="M35 24q6 0 9-5" fill="none" stroke="#476538" stroke-width="2.7"/>`,
  tebasaki: `<path d="m38 17 10-7q-1-6 3-7 4-1 5 4 5 0 5 4 0 4-6 4L45 24z" fill="#f9deb0"/>
    <path d="M6 22Q6 13 16 9q8-4 14-2 8 0 15 7l5 4q2 4-3 7l-9 1q-6 7-14 9-11 4-17-2-4-5-1-11z" fill="url(#wing)"/>
    <path d="M12 20q5-6 13-7m3 0 3 1" fill="none" stroke="#ffdda3" stroke-width="3"/>
    <path d="m19 27 5-5m4 5 7-7" stroke="#99521f" stroke-width="3.2"/>`,
};
const paints = {
  glaze: ["#ffbf4d","#ef8a24","#d46a23"], leek: ["#f0df65","#b7c543","#93a732"],
  meatball: ["#e3a260","#b9763d","#92502b"], cap: ["#bb885d","#99623f","#784831"],
  liver: ["#b35f69","#944754","#713346"], egg: ["#fff6dc","#f4e1ab","#ddb97e"],
  "heart-meat": ["#ec8f70","#d36754","#bb5048"], pepper: ["#9cbd50","#739d42","#577b3a"],
  wing: ["#efbc73","#e49b49","#c9843e"],
};

const uiPaths = {
  shop: '<path d="M3 10.5 4.8 4h14.4l1.8 6.5M4 11v9h16v-9M8 20v-6h5v6M3 10c0 3.4 4.5 3.4 4.5 0 0 3.4 4.5 3.4 4.5 0 0 3.4 4.5 3.4 4.5 0 0 3.4 4.5 3.4 4.5 0M8.6 4l-1.1 6M15.5 4l1 6"/>',
  book: '<path d="M12 6.6c-2.3-2-5.5-2.8-9-2v13.8c3.3-.9 6.3-.3 9 1.7 2.5-2 5.7-2.6 9-1.7V4.6c-3.7-.8-6.7.1-9 2zM12 7v13"/>',
  sound: '<path d="M3 9h4l5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8m2.8-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M3 9h4l5-4v14l-5-4H3zM16 9l5 6m0-6-5 6"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  shuffle: '<path d="M3 6h3c4 0 7 12 11 12h4m-3-3 3 3-3 3M3 18h3c1.8 0 3.3-2.3 4.6-4.5M13 9c1.3-2.1 2.5-3 4-3h4m-3-3 3 3-3 3"/>',
  grill: '<path d="M3 11h18l-2 7H5zM7 18l-1 3m11-3 1 3M7 8l1-4m4 4 1-4m4 4 1-4"/>',
  extra: '<path d="M3 11h17l-2 7H5zM7 18l-1 3m10-3 1 3M6 8l1-4m4 4 1-4m7-2v6m-3-3h6"/>',
  retry: '<path d="M5 9a8 8 0 1 1-.3 6M5 3v6h6"/>',
  tray: '<path d="M3 17h18l-2 3H5zM5 14a7 7 0 0 1 14 0M12 7V5m-1 0h2"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2m-5-13h4"/>',
  move: '<path d="M8 20 4 14q-1-2 1-3 1-1 3 1l1 1V5q0-3 3-2 1 .4 1 2v5l1-1.1q1.5-.8 2.5.9 1.8-1 2.8.6 2.1-.5 2.1 2.2v2.5q0 2-1.8 4.9"/>',
  stool: '<path d="M4 10q0-2 3-2h10q3 0 3 2v2H4zm3 3-2 7m12-7 2 7M7 16h10"/>',
  heart: '<path d="M12 21S2 15 2 8.6C2 3.6 8 1.5 12 6c4-4.5 10-2.4 10 2.6C22 15 12 21 12 21z"/>',
};
function ui(name) {
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><use href="#ui-${name}"/></svg>`;
}

const portraits = {
  bob:    ["#503535","#f3bb91","#a65b47",'<path d="M8 25Q6 7 20 6q14-3 17 12l1 8-5 1-1-12q-5 5-15 4l-4 7z"/>'],
  bun:    ["#483439","#efbf99","#849346",'<circle cx="30" cy="7" r="5"/><path d="M9 24Q7 11 18 7q13-5 18 9l-1 8-4-9q-8 3-12 0l-7 9z"/>'],
  crop:   ["#5e4139","#d99468","#c78242",'<path d="M9 22Q8 6 22 6q11-1 14 11l-2 7-4-10-6 2 1-3-9 4-4-1z"/>'],
  fringe: ["#7a4b34","#f1bb90","#bd704b",'<path d="M8 25 9 15Q13 4 25 6q13 1 12 16l-4 3-3-12-3 4-2-4-4 4-2-3-6 5-2 7z"/>'],
  silver: ["#a89b86","#e9b28b","#73845e",'<path d="M9 23Q8 10 16 8l5 1 4-3q12 0 12 17l-3 2-3-11q-7 4-11 1-7 0-9 10z"/>'],
  cap:    ["#59403a","#e8ae83","#9a6750",'<path d="M9 24 9 17Q8 7 21 6q11 0 14 11l-1 7-3-9-17 2-3 8z"/><path d="M8 16Q8 4 21 4q12-1 13 10l-12 3-9 1z" fill="#8c9b59"/><path d="M8 15q9 0 17-3 6-1 11 2-4 4-15 5l-13-1z" fill="#788749"/>'],
};
const FACES = Object.keys(portraits);
function portrait(face, mood) {
  const [hair, skin, shirt, style] = portraits[face];
  const eyes = mood === "happy" ? '<path d="m16 23 2-1 2 1m5 0 2-1 2 1" fill="none"/>'
    : '<circle cx="18" cy="23" r="1.3" fill="#512e32" stroke="none"/><circle cx="27" cy="23" r="1.3" fill="#512e32" stroke="none"/>';
  const mouth = mood === "angry" ? 'M19 30q3-3 6 0m-10-10 4 1m7 0 4-1' : mood === "happy" ? 'M18 27q4 8 9 0z' : 'M20 28q2 2 5-.5';
  return `<svg class="portrait" viewBox="0 0 44 44" aria-hidden="true" focusable="false"><g stroke="#523336" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 44q1-10 13-12h12q12 2 13 12" fill="${shirt}"/><path d="M11 22q-2-12 9-14 13-2 15 10l-1 9q-2 8-12 9-9-1-11-10z" fill="${skin}"/><g fill="${hair}">${style}</g>${eyes}<path d="${mouth}" fill="none"/></g></svg>`;
}

function skSVG(k) {
  return `<svg class="skewer-art" viewBox="0 0 60 128" aria-hidden="true" focusable="false"><use href="#skewer-${k}"/></svg>`;
}
function icon(k) {
  const p = k === "negima" ? "negi" : k;
  return `<svg class="piece-art" viewBox="0 0 60 40" aria-hidden="true" focusable="false"><use href="#piece-${p}"/></svg>`;
}
function installArt() {
  const gradients = Object.entries(paints).map(([id, colors]) =>
    `<linearGradient id="${id}" x2=".35" y2="1"><stop stop-color="${colors[0]}"/><stop offset=".54" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient>`);
  const pieces = Object.entries(pieceArt).map(([id, art]) =>
    `<g id="piece-${id}" stroke="#412637" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round">${art}</g>`);
  const skewers = KIND_ORDER.map(k => {
    const bits = KINDS[k].p.map((p, i) =>
      `<g transform="translate(0 ${8 + i * 28})"><use href="#piece-${p}" transform="rotate(${[-7,5,-3][i]} 30 20)"/></g>`);
    return `<g id="skewer-${k}"><path d="M27 14q1-9 3-12 2 0 3 12l1.5 107q0 3-3 4l-4-1q-2-.5-1.5-3z" fill="#e9ab59" stroke="#472737" stroke-width="2.9" stroke-linejoin="round"/><path d="m29.2 101-.4 17" stroke="#ffda8d" stroke-width="1.7" stroke-linecap="round"/>${bits.join("")}</g>`;
  });
  const symbols = Object.entries(uiPaths).map(([id, paths]) => `<g id="ui-${id}">${paths}</g>`);
  const dish = `<g id="prep-dish">
    <ellipse cx="60" cy="47" rx="51" ry="16" fill="#82613d" opacity=".18"/>
    <path d="M3 33C4 51 25 60 60 60s56-9 57-27" fill="#d9c4a0" stroke="#6c4a38" stroke-width="2.8"/>
    <ellipse cx="60" cy="32" rx="57" ry="23" fill="#fff9e8" stroke="#684a3b" stroke-width="2.8"/>
    <ellipse cx="60" cy="32" rx="47" ry="16.3" fill="#f4ead4" stroke="#c7af8e" stroke-width="1.5"/>
    <path d="M10 32c1 6 9 12 21 15m58-29 5 2m1 0 4 2m1 0 3 2" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M21 23q7-5 21-7" fill="none" stroke="#fffdf3" stroke-width="3.7" stroke-linecap="round"/>
  </g>`;
  document.getElementById("art-defs").innerHTML = `<defs>${[...gradients,...pieces,...skewers,...symbols,dish].join("")}</defs>`;
}
installArt();
