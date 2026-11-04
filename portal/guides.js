(function () {
  'use strict';
  // Written from the games' current instructions and source, not inferred from their names.
  const rows = {
    WaterSortPuzzle: [
      ['移したい瓶、移し先の瓶の順にタップします。一番上で連続している同じ色の水を、空の瓶か同じ色の上へ注ぎ、瓶ごとに一色にそろえます。', '空き瓶は水を一時的に逃がす場所です。目先の色だけをまとめず、次に動かせる場所を残してみましょう。困ったらゲーム内の遊び方を確認できます。'],
      ['Tap a source bottle, then a destination. The matching layers at the top pour into an empty bottle or onto the same color. Sort each bottle into one color.', 'Keep room to move. An empty bottle can hold water temporarily while you uncover another color. Open the in-game help if you need the full rules.'],
      ['先点击要倒出的瓶子，再点击目标瓶子。顶部连续同色的水只能倒入空瓶或相同颜色上方，目标是让每瓶只剩一种颜色。', '空瓶是临时腾挪的空间。不要只顾眼前凑色，也要为下一步留下位置。遇到困难时可查看游戏内的玩法说明。'],
      ['Toca el frasco de origen y después el de destino. Las capas superiores del mismo color pasan a un frasco vacío o sobre ese color. Agrupa un solo color por frasco.', 'Conserva espacio para mover el agua. Un frasco vacío sirve de apoyo mientras descubres otros colores. Consulta la ayuda del juego para ver las reglas completas.']
    ],
    'todofuken-draft': [
      ['ひとりならCPU戦、みんななら1台を交代で使うモードを選びます。人数と指名数を決め、県カードを指名したら、作戦会議で並び順を決めて対戦します。', '総合値だけでなく、今回勝負する能力を見て選ぶと作戦が変わります。県の能力値はゲーム用の設定で、実際の統計や住民の能力を表す数値ではありません。'],
      ['Choose a CPU match or pass one device around a group. Set the player and draft counts, pick prefecture cards, then arrange your team in the strategy phase before battling.', 'Choose for the attributes used in the match, rather than just the total score. Card attributes are fictional game settings, not official statistics or ratings of residents.'],
      ['可以选择对战电脑，或多人轮流使用同一台设备。设定人数和选秀数量，挑选都道府县卡牌，再在作战阶段安排出场顺序。', '选牌时注意本场比拼的能力，不要只看总分。卡牌能力是游戏设定，并非真实统计，也不是对当地居民的评价。'],
      ['Elige jugar contra la CPU o pasar un dispositivo entre varias personas. Configura los participantes y las selecciones, elige prefecturas y ordena el equipo antes de competir.', 'Mira los atributos que se comparan en la partida. Los valores de las cartas son ajustes del juego, no estadísticas oficiales ni evaluaciones de sus habitantes.']
    ],
    'rin-harbor': [
      ['同じ種類・同じレベルのアイテムを合成し、注文に必要な品をつくって納品します。アイテムを1回タップすると名前とレベルを確認できます。', '注文の絵を押すと、必要な屋台と合成の順番がわかります。盤面が狭くなったら倉庫も活用しましょう。記録を残したいときはゲーム内のバックアップを確認してください。'],
      ['Merge two items of the same type and level, then deliver the items requested by orders. Tap an item once to check its name and level.', 'Tap an order picture to see the producer and merge sequence. Use the warehouse when the board gets crowded. Check the game’s backup feature to keep a copy of your progress.'],
      ['合成同种类、同等级的物品，制作订单所需的成品并交付。点击一次物品即可查看名称和等级。', '点击订单图片可查看生产摊位和合成顺序。棋盘拥挤时可以使用仓库；想保留进度副本时，请查看游戏内的备份功能。'],
      ['Combina dos objetos del mismo tipo y nivel para preparar y entregar pedidos. Toca un objeto una vez para ver su nombre y nivel.', 'Toca la imagen de un pedido para consultar el puesto y la secuencia de combinación. Usa el almacén si falta espacio y revisa la función de copia de seguridad para conservar tu progreso.']
    ],
    'word-wolf2': [
      ['参加者とウルフの人数を設定し、1台を回して自分のお題だけを確認します。お題そのものを言わずに話し合い、違うお題を持っていそうな人へ投票します。', '最初は広い特徴から話すと、お題がすぐにばれず会話が続きます。大逆転モードを使うと、追放後にウルフが市民のお題を当てるチャンスがあります。'],
      ['Set the players and wolves, then pass one device around so each person sees only their own word. Discuss without saying the word itself, then vote for someone who seems to have a different word.', 'Start with broad clues to keep the discussion going. With reversal mode enabled, an expelled wolf gets a chance to guess the citizens’ word. The topic words remain Japanese.'],
      ['设置玩家和狼的人数，轮流使用同一台设备，只查看自己的词语。不直接说出词语，通过讨论找出拿到不同词语的人并投票。', '先聊宽泛特征，可以避免过早泄露词语。开启逆转模式后，被放逐的狼还有机会猜出市民的词语。题目词语仍为日语。'],
      ['Configura los jugadores y lobos y pasa el dispositivo para que cada persona vea solo su palabra. Conversad sin decir la palabra y votad por quien parezca tener una distinta.', 'Empieza con pistas generales. Si activas el modo de remontada, el lobo expulsado puede intentar adivinar la palabra de los demás. Las palabras del juego siguen en japonés.']
    ],
    'Chroma-sort': [
      ['画面に並ぶ色を見比べ、ゲーム内の案内に沿って移動先を選び、色を整理します。最初は取り組みやすい難易度で、動かせる場所を確かめながら進めましょう。', '色の数や並びを一度に覚えようとせず、まず一色の行き先に注目してみましょう。途中で動かせなくなったら、別の動かし方を考えるのもパズルの楽しみです。'],
      ['Compare the colors on the board and follow the in-game prompts to select moves and sort them. Start with a manageable difficulty and check which destinations are available.', 'Focus on where one color should go before trying to track the whole board. When a move blocks your options, consider a different route.'],
      ['观察棋盘上的颜色，按照游戏内提示选择移动位置并整理颜色。建议先从容易的难度开始，确认哪些位置可以移动。', '不必一次记住全部排列，先想清一种颜色该去哪里。某一步限制了后续选择时，可以尝试另一条思路。'],
      ['Compara los colores y sigue las indicaciones del juego para elegir movimientos y ordenarlos. Empieza con una dificultad asequible y comprueba los destinos disponibles.', 'Céntrate primero en el destino de un color. Si un movimiento te deja sin opciones, busca otra secuencia.']
    ],
    yakitori: [
      ['串をタップしてから移動先の焼き台をタップし、空き場所へ移します。同じ焼き台に同じ串を3本そろえると、焼き上がってお客さんの注文に届きます。', '焼き台と客席の「つぎ」を見て、先の注文も考えると運びやすくなります。待たせすぎて3人を怒らせると閉店です。困ったときは回数制限つきの補助を使えます。'],
      ['Tap a skewer, then a grill with space. Match three identical skewers on one grill to cook them and serve customers’ orders.', 'Check the next skewers and upcoming orders before moving. The shop closes if three customers lose patience. Limited-use helpers can get you out of a tight spot.'],
      ['先点击烤串，再点击有空位的烤架。让同一烤架上出现三根相同烤串，即可烤熟并送给点单的客人。', '注意烤架和客席旁的“下一个”，提前考虑后续订单。三位客人因等待过久而生气就会关店；遇到困难时可使用次数有限的辅助功能。'],
      ['Toca una brocheta y después una parrilla con espacio. Reúne tres iguales en la misma parrilla para cocinarlas y servir los pedidos.', 'Mira las siguientes brochetas y los próximos pedidos. El local cierra si tres clientes pierden la paciencia. Las ayudas tienen usos limitados.']
    ],
    'atama-oshiri': [
      ['指定された最初と最後の文字を使う日本語を考えます。ひとりモードは60秒でたくさん答える遊び、みんなモードはお題を見て口で答える早い者勝ちです。', '身近な食べ物や動物など、種類をひとつ決めると言葉が浮かびやすくなります。慣れてきたら文字数しばりにも挑戦できます。'],
      ['Think of a Japanese word with the specified first and last characters. Solo mode gives you 60 seconds; group mode is a spoken race to answer the prompt.', 'Try a familiar category such as food or animals to find words. Once you are comfortable, try the word-length restriction. The word task uses Japanese.'],
      ['想出以指定文字开头和结尾的日语词语。单人模式限时60秒，多人模式则看题目口头抢答。', '先从食物或动物等熟悉类别联想，更容易想出词语。熟悉后可以挑战限定字数。词语题目使用日语。'],
      ['Piensa en una palabra japonesa con el primer y último carácter indicados. El modo individual dura 60 segundos; en grupo se responde en voz alta lo antes posible.', 'Piensa en categorías conocidas, como comida o animales. Después prueba la restricción de longitud. La actividad de palabras utiliza japonés.']
    ],
    'nihon-meguri-47': [
      ['県庁所在地・名所・ご当地グルメなどからジャンルを選び、4つの選択肢から答えます。1回10問で、時間を気にせず解説を読みながら進められます。', 'ふりがなを切り替えられるので、漢字が難しいときにも試せます。間違えた問題は復習し、答えだけでなく解説の地名や特徴も振り返ってみましょう。'],
      ['Choose a topic such as prefectural capitals, landmarks or local food, then answer multiple-choice questions. A round has ten questions with no time limit.', 'Use the furigana option to help read kanji. Review missed questions and the explanations, rather than memorizing only the correct choice. Questions remain Japanese.'],
      ['选择县厅所在地、名胜或当地美食等主题，再从四个选项中作答。每轮十题，没有时间限制，可以边读解析边思考。', '汉字难读时可切换注音。复习错题时，也请回顾解析中的地名和特点，而不只是记住选项。题目仍为日语。'],
      ['Elige capitales, lugares de interés o gastronomía local y responde entre cuatro opciones. Cada ronda tiene diez preguntas y no hay límite de tiempo.', 'Activa el furigana si necesitas ayuda con los kanji. Repasa las explicaciones de los errores, no solo la opción correcta. Las preguntas siguen en japonés.']
    ],
    jintori: [
      ['画面のお題と順位を手がかりに、日本地図で該当すると思う都道府県を選びます。問題が進むたびに、お題と地図の両方を確認しましょう。', '不正解で選んだ県も、次の問題以降に再び選べます。ランキングはゲーム内の条件や出典とあわせて読み、最新の公的順位と同じだと決めつけないでください。'],
      ['Read the topic and ranking clue, then select the matching prefecture on the map of Japan. Check both the new clue and the map as each question appears.', 'A prefecture chosen incorrectly can be selected again on later questions. Read rankings with their in-game conditions and sources; do not assume they are current official rankings.'],
      ['根据题目的主题和排名提示，在日本地图上选择你认为符合条件的都道府县。每次出新题时，都要重新查看提示和地图。', '答错时选过的县在后续题目中仍可再选。请结合游戏内的条件与来源理解排名，不要直接当作最新官方排名。'],
      ['Lee el tema y la pista de clasificación y selecciona una prefectura en el mapa de Japón. Comprueba la pista y el mapa en cada pregunta.', 'Las prefecturas elegidas incorrectamente pueden volver a seleccionarse más adelante. Interpreta las clasificaciones según sus condiciones y fuentes; no las tomes como datos oficiales actuales.']
    ],
    kotowaza: [
      ['慣用句・ことわざ・故事成語などのモードを選び、10問のクイズに答えます。意味を選ぶ問題だけでなく、場面に合う言葉を考える問題もあります。', '結果を見たら言葉図鑑や復習モードへ。間違えた表現を自分の言葉で説明したり、日常の例文をひとつ考えたりすると、意味を振り返りやすくなります。'],
      ['Choose idioms, proverbs or classical expressions and answer ten questions. Some ask for a meaning; others ask which expression fits a situation.', 'After the results, explore the phrase collection or review mode. Explain a missed phrase in your own words or make an everyday example sentence. The expressions are Japanese.'],
      ['选择惯用语、谚语或典故成语等模式，完成十道题。有些题选择含义，有些题需要判断哪种表达符合场景。', '查看成绩后，可以进入词语图鉴或复习模式。试着用自己的话解释答错的表达，或造一个日常例句。学习内容为日语。'],
      ['Elige modismos, refranes o expresiones clásicas y responde diez preguntas. Algunas preguntan el significado y otras qué expresión encaja en una situación.', 'Tras los resultados, consulta la colección o el repaso. Explica una expresión con tus propias palabras o crea un ejemplo cotidiano. El contenido utiliza japonés.']
    ],
    'nazonazo-kids': [
      ['表示されたなぞなぞを読み、答えを考えて進めます。ひとつの言葉に別の意味がないか、問題の読み方を変えられないかも試してみましょう。', '答えがわかったら、解説で「なぜその答えになるのか」も確認します。家族と遊ぶときは、すぐ正解を教えずにヒントを少しずつ出すと会話が広がります。'],
      ['Read each riddle and think through the answer. Look for another meaning of a word or a different way to read the question.', 'Check why the explanation leads to the answer. When playing with family, offer small hints rather than immediately giving the solution. The riddles use Japanese wordplay.'],
      ['阅读屏幕上的谜语并思考答案。可以试着寻找词语的另一层含义，或换一种方式理解题目。', '答出后也要查看解析，理解为什么是这个答案。家人一起玩时，可以逐步给提示，而不是马上公布答案。谜语包含日语文字游戏。'],
      ['Lee cada acertijo y piensa la respuesta. Busca otro significado de una palabra o una forma distinta de interpretar la pregunta.', 'Consulta la explicación para entender la solución. En familia, da pequeñas pistas antes de revelar la respuesta. Los acertijos incluyen juegos de palabras en japonés.']
    ],
    'react-game': [
      ['スタートしたら合図を待ち、「タップ！」と出たときだけ押します。早押しや別の表示への反応は失敗になるので、速さだけでなく見極めも大切です。', 'フェイントに引っかからずに押せた回の記録を比べてみましょう。端末やブラウザーの遅延にも左右される遊びの記録で、医学的な反応速度の検査ではありません。'],
      ['Start and wait. Press only when the “Tap!” cue appears; pressing early or reacting to a feint is a failure. Recognizing the right signal matters as well as speed.', 'Compare successful attempts without falling for feints. Device and browser delay affect the result. This is a game, not a medical reaction-time assessment.'],
      ['开始后等待信号，只有出现“点击！”的提示时才按。提前按或被假动作骗到都会失败，因此看准信号和速度同样重要。', '可以比较没有被假动作骗到的成功记录。成绩会受到设备和浏览器延迟影响，这只是游戏，不是医学反应速度测试。'],
      ['Empieza y espera. Pulsa solo cuando aparezca la señal de tocar; adelantarte o caer en una distracción supone un fallo. Reconocer la señal también importa.', 'Compara los intentos acertados. La latencia del dispositivo y del navegador afecta al resultado: es un juego, no una evaluación médica de reflejos.']
    ]
  };
  const langs = ['ja','en','zh','es'];
  const guides = Object.fromEntries(Object.entries(rows).map(([id, translations]) => [id,
    Object.fromEntries(langs.map((lang, i) => [lang, {steps:translations[i][0], tip:translations[i][1]}]))
  ]));
  if (typeof module !== 'undefined' && module.exports) module.exports = guides;
  if (typeof window !== 'undefined') window.MainichiGuides = guides;
}());
