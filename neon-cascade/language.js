const LANGUAGES = ['ja', 'en', 'zh', 'es'];
const LANGUAGE_KEY = 'mainichi:language';

export function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Private browsing may block storage. */ }
}

const COPY = {
  back: ['ゲーム一覧', 'All games', '游戏列表', 'Todos los juegos'],
  sound: ['サウンド', 'Sound', '声音', 'Sonido'],
  help: ['遊び方', 'How to play', '玩法', 'Cómo jugar'],
  score: ['スコア', 'Score', '分数', 'Puntos'],
  best: ['ベスト', 'Best', '最高分', 'Récord'],
  time: ['残り時間', 'Time left', '剩余时间', 'Tiempo'],
  pause: ['一時停止', 'Pause', '暂停', 'Pausa'],
  paused: ['一時停止中', 'Paused', '已暂停', 'En pausa'],
  resume: ['再開', 'Resume', '继续', 'Continuar'],
  quit: ['今回を終了', 'Finish run', '结束本局', 'Terminar partida'],
  start: ['プレイ開始', 'Start playing', '开始游戏', 'Jugar'],
  upgrade: ['強化を1つ選択', 'Choose one upgrade', '选择一项强化', 'Elige una mejora'],
  upgradeNote: ['効果はこのプレイ中ずっと続きます。', 'Lasts for the rest of this run.', '效果持续至本局结束。', 'Dura hasta el fin de la partida.'],
  result: ['タイムアップ', 'Time’s up', '时间到', 'Se acabó el tiempo'],
  finished: ['プレイ終了', 'Run complete', '本局结束', 'Partida terminada'],
  record: ['自己ベスト更新！', 'New personal best!', '刷新个人纪录！', '¡Nuevo récord personal!'],
  retry: ['もう一度', 'Play again', '再玩一次', 'Jugar de nuevo'],
  copy: ['スコアをコピー', 'Copy score', '复制成绩', 'Copiar puntuación'],
  copied: ['コピーしました', 'Copied!', '已复制', '¡Copiado!'],
  copyFailed: ['コピーできませんでした', 'Could not copy', '复制失败', 'No se pudo copiar'],
  board: ['パズル盤面', 'Puzzle board', '益智棋盘', 'Tablero'],
  boardHint: ['同じ色を3つ以上つなぐ。ななめもOK。', 'Link 3 or more matching pieces, including diagonals.', '连接至少3个同色宝石，可斜连。', 'Une 3 o más piezas iguales, también en diagonal.'],
  charge: ['オーバードライブの充電', 'Overdrive charge', '超载充能', 'Carga de Sobremarcha'],
  drive: ['オーバードライブ', 'Overdrive', '超载', 'Sobremarcha'],
  activate: ['発動', 'Activate', '启动', 'Activar'],
  active: ['発動中', 'Active', '已启动', 'Activa'],
  ready: ['オーバードライブ準備完了！', 'Overdrive ready!', '超载就绪！', '¡Sobremarcha lista!'],
  side: ['モードとプレイ状況', 'Modes and stats', '模式与统计', 'Modos y estadísticas'],
  mode: ['ゲームモード', 'Game mode', '游戏模式', 'Modo de juego'],
  sprint: ['60秒アタック', '60-second sprint', '60秒冲刺', 'Sprint de 60 s'],
  sprintDetail: ['毎回違う盤面でスコアに挑戦', 'A fresh board every run', '每局棋盘都不同', 'Un tablero distinto cada vez'],
  sprintIntro: ['同じ色を3つ以上なぞって、60秒でハイスコアへ。', 'Link 3+ matching pieces. Chase your best in 60 seconds.', '连接至少3个同色宝石，60秒内冲击最高分。', 'Une 3 o más piezas iguales. Tienes 60 segundos.'],
  daily: ['デイリー', 'Daily', '每日挑战', 'Diario'],
  dailyDetail: ['{date}の共通盤面', '{date} shared board', '{date} 共用棋盘', 'Tablero común del {date}'],
  dailyIntro: ['今日の共通盤面で、60秒のスコア勝負。', 'One shared board today. Score big in 60 seconds.', '挑战今日共用棋盘，60秒冲击高分。', 'El mismo tablero hoy para todos. Tienes 60 segundos.'],
  practice: ['練習', 'Practice', '练习', 'Práctica'],
  practiceDetail: ['時間を気にせず連鎖を試す', 'Try cascades at your own pace', '不限时，练习连锁', 'Prueba las cadenas a tu ritmo'],
  practiceIntro: ['時間制限なし。長いチェーンと連鎖爆発を試そう。', 'No timer. Try long chains and cascading blasts.', '不限时，试试长链与连锁爆炸。', 'Sin límite de tiempo. Prueba cadenas largas y explosiones.'],
  combo: ['コンボ', 'Combo', '连击', 'Combo'],
  longest: ['最長チェーン', 'Longest chain', '最长连线', 'Cadena más larga'],
  cleared: ['消したピース', 'Pieces cleared', '消除宝石', 'Piezas eliminadas'],
  rules: ['連鎖のコツ', 'Cascade tips', '连锁技巧', 'Consejos'],
  tipChain: ['3つ以上つなぐと、同じ色をまとめて消せる。', 'Link 3 or more to clear matching pieces.', '连接至少3个同色宝石即可消除。', 'Une 3 o más piezas iguales para eliminarlas.'],
  tipCore: ['5つ以上で爆発コア。コアをタップして起爆。', 'Link 5+ to make a core. Tap it to detonate.', '连5个以上生成爆破核心，点击引爆。', 'Une 5 o más para crear un núcleo. Tócalo para detonarlo.'],
  tipDrive: ['ゲージ満タンで、6秒間の得点が2倍。', 'Fill the meter to score double for 6 seconds.', '充满能量，6秒内获得双倍分数。', 'Llena la barra para duplicar puntos durante 6 s.'],
  language: ['言語', 'Language', '语言', 'Idioma'],
  close: ['閉じる', 'Close', '关闭', 'Cerrar'],
  helpChain: ['同じ色を3つ以上、指かマウスでなぞって離します。ななめにもつながり、1つ前のピースに戻ると取り消せます。', 'Drag across 3 or more matching pieces and release. Diagonals count. Trace back one piece to undo it.', '用手指或鼠标划过至少3个同色宝石后松开。可以斜连，也可退回上一颗撤销。', 'Arrastra sobre 3 o más piezas iguales y suelta. Puedes ir en diagonal y volver a la pieza anterior para deshacer un paso.'],
  helpCore: ['5つ以上で最後に爆発コアが残ります。コアは単独タップでも起爆でき、爆風に当たったコアも連鎖します。', 'Link 5+ to leave a blast core at the end. Tap it to detonate. Cores caught in a blast detonate too.', '连接至少5颗会在末端留下爆破核心。点击可引爆，爆炸波及的核心也会引爆。', 'Une 5 o más para dejar un núcleo al final. Tócalo para detonarlo. También explotan los núcleos alcanzados.'],
  helpDrive: ['素早く続けて消すとコンボで得点アップ。ゲージが満タンになったら、発動ボタンで全コアが爆発し、6秒間の得点が2倍になります。', 'Clear pieces in quick succession to raise your combo. With a full meter, activate Overdrive to detonate all cores and double points for 6 seconds.', '连续快速消除可提高连击。能量满时启动超载，引爆所有核心并获得6秒双倍分数。', 'Elimina piezas seguidas para subir el combo. Con la barra llena, activa Sobremarcha para detonar los núcleos y duplicar puntos durante 6 s.'],
  helpUpgrade: ['5回目と12回目にピースを消すと強化を選べます。選んでいる間はタイマーが止まります。', 'Choose an upgrade after your 5th and 12th clears. The timer pauses while you choose.', '第5次和第12次消除后可选择强化。选择时暂停计时。', 'Elige una mejora al eliminar piezas por 5.ª y 12.ª vez. El tiempo se detiene mientras eliges.'],
  keyboard: ['キーボード', 'Keyboard', '键盘', 'Teclado'],
  helpKeys: ['Enterで選択・確定、矢印キーで移動、Q・E・Z・Cでななめ、Spaceで発動、Escで取り消し・一時停止。', 'Enter selects or commits, arrows move, Q/E/Z/C move diagonally, Space activates Overdrive, and Esc cancels or pauses.', 'Enter 选择或确认，方向键移动，Q/E/Z/C 斜移，空格启动超载，Esc 取消或暂停。', 'Enter selecciona o confirma, flechas para moverte, Q/E/Z/C en diagonal, Espacio para activar Sobremarcha y Esc para cancelar o pausar.'],
  lowEffects: ['演出を控えめにする', 'Reduce effects', '减少特效', 'Reducir efectos'],
  colors: [['ミント', 'ピンク', '紫', '青', '金'], ['Mint', 'Pink', 'Violet', 'Blue', 'Gold'], ['薄荷绿', '粉色', '紫色', '蓝色', '金色'], ['Menta', 'Rosa', 'Violeta', 'Azul', 'Dorado']],
  cell: ['{row}行{col}列 {color}', 'Row {row}, column {col}, {color}', '第{row}行第{col}列，{color}', 'Fila {row}, columna {col}, {color}'],
  core: ['{color}の爆発コア', '{color} blast core', '{color}爆破核心', 'Núcleo {color}'],
  selected: ['{n}チェーン', '{n} linked', '已连接 {n} 颗', '{n} enlazadas'],
  needThree: ['同じ色を3つ以上つなごう', 'Link at least 3 matching pieces', '请连接至少3颗同色宝石', 'Une al menos 3 piezas iguales'],
  madeCore: ['爆発コア生成！', 'Blast core created!', '爆破核心已生成！', '¡Núcleo creado!'],
  coreBlast: ['コア起爆！', 'Core detonated!', '核心已引爆！', '¡Núcleo detonado!'],
  blasts: ['{n}連鎖爆発！', '{n} core blasts!', '{n} 个核心连锁爆炸！', '¡{n} núcleos detonados!'],
  shuffle: ['盤面を入れ替えました', 'Board shuffled', '棋盘已重排', 'Tablero mezclado'],
  stats: ['最長 {chain}チェーン · {clear}ピース消去', 'Longest chain: {chain} · {clear} pieces cleared', '最长连线 {chain} · 消除 {clear} 颗', 'Cadena más larga: {chain} · {clear} piezas eliminadas'],
  wideName: ['拡散コア', 'Wide blast', '扩散爆破', 'Explosión amplia'],
  wideDetail: ['コアの爆発範囲が1マス広がる', 'Core blasts reach one tile further', '核心爆破范围扩大一格', 'Los núcleos alcanzan una casilla más'],
  surgeName: ['急速チャージ', 'Fast charge', '快速充能', 'Carga rápida'],
  surgeDetail: ['ゲージの増加量が1.5倍', 'Charge the meter 50% faster', '充能速度提高50%', 'La barra se carga un 50% más rápido'],
  chainName: ['ロングチェーン', 'Long chain', '长链加成', 'Cadena larga'],
  chainDetail: ['5チェーン以上の基本点が1.5倍', '50% more base points for chains of 5+', '5连以上的基础分提高50%', '50 % más de puntos base en cadenas de 5 o más'],
  comboName: ['コンボキープ', 'Combo keeper', '连击延续', 'Mantén el combo'],
  comboDetail: ['コンボの受付時間が2秒延びる', 'Keep your combo for 2 more seconds', '连击有效时间延长2秒', 'Tienes 2 s más para continuar el combo'],
  driveName: ['ロングドライブ', 'Long Overdrive', '超载延长', 'Sobremarcha larga'],
  driveDetail: ['オーバードライブが8秒続く', 'Overdrive lasts 8 seconds', '超载持续8秒', 'Sobremarcha dura 8 segundos'],
  coreName: ['早熟コア', 'Quick core', '速成核心', 'Núcleo rápido'],
  coreDetail: ['4チェーンから爆発コアを作れる', 'Chains of 4 can create a core', '4连即可生成爆破核心', 'Las cadenas de 4 ya crean un núcleo'],
};

const requested = new URLSearchParams(location.search).get('lang');
if (LANGUAGES.includes(requested)) write(LANGUAGE_KEY, requested);
const stored = read(LANGUAGE_KEY);
const browser = navigator.language?.slice(0, 2);
export const language = [requested, stored, browser, 'ja'].find((code) => LANGUAGES.includes(code));
export const locale = language === 'zh' ? 'zh-CN' : language;
const column = LANGUAGES.indexOf(language);

export function tr(key, values = {}) {
  const copy = COPY[key][column];
  return typeof copy === 'string' ? copy.replace(/\{(\w+)\}/g, (_, name) => values[name]) : copy;
}

export function setupLanguage(selector) {
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll('[data-text]')) element.textContent = tr(element.dataset.text);
  for (const element of document.querySelectorAll('[data-label]')) element.setAttribute('aria-label', tr(element.dataset.label));
  selector.value = language;
  selector.addEventListener('change', () => {
    const url = new URL(location.href);
    url.searchParams.set('lang', selector.value);
    location.href = url;
  });
}
