const fs = require('node:fs');
const path = require('node:path');
const {langs, games, ui} = require('./catalog.js');
const guides = require('./guides.js');
const out = path.resolve(__dirname, '../deployment/pages');
fs.mkdirSync(out, {recursive:true});
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// Each row is [heading, body] in Japanese, English, Simplified Chinese, Spanish.
const pages = {
  about: [
    [
      ['遊びと学びの、小さな道具箱','まいにち道具箱は、ブラウザーで遊べる無料ゲームと、暮らしの計算ツールをまとめた個人運営のサイトです。ひとりで考えるパズル、同じ端末を回して遊ぶ家族ゲーム、日本の地理や言葉を学ぶクイズから、その日の気分で選べます。'],
      ['A small toolbox for play and learning','Mainichi Toolbox is an independently run collection of free browser games and everyday calculators. Choose a solo puzzle, a family game played by passing one device, or a quiz about Japanese places and words.'],
      ['游戏与学习的小工具箱','每日工具箱是个人运营的网站，汇集免费浏览器游戏和生活计算工具。你可以选择独自思考的拼图、轮流使用同一设备的家庭游戏，以及学习日本地理和词语的问答。'],
      ['Una pequeña caja para jugar y aprender','Mainichi Toolbox es una web independiente de juegos gratuitos para navegador y calculadoras cotidianas. Elige un puzle individual, un juego familiar compartiendo un dispositivo o un cuestionario sobre lugares y palabras de Japón.']
    ],
    [
      ['ここでできること','ゲーム一覧には遊び方と考え方のヒントを添えています。「遊ぶ」を選ぶとページ内にゲームが開き、別タブでも利用できます。案内とゲームの操作表示は4言語に対応していますが、問題文・お題など日本語を使う内容は日本語のままです。'],
      ['What you can do here','Each game card includes instructions and tips. Select Play to open the game within this page, or use a separate tab. Site guidance and game controls support four languages; Japanese questions and word-based content remain Japanese.'],
      ['如何使用','游戏卡片附有玩法与思路提示。选择“开始”可在当前页面打开游戏，也可使用独立标签页。网站指引与游戏操作界面支持四种语言；日语题目和词语内容仍保留日语。'],
      ['Cómo utilizar la web','Cada ficha incluye instrucciones y consejos. Pulsa Jugar para abrir el juego en la página o utiliza otra pestaña. La guía y los controles admiten cuatro idiomas; las preguntas y actividades de palabras japonesas conservan el japonés.']
    ],
    [
      ['運営と制作','運営名は「まいにち道具箱」です。旧名称はEveryday Japan Labで、以前の英語の生活ガイド・計算ツールも残しています。制作や翻訳、コード開発にはAIの補助を利用します。掲載内容の修正や不具合への対応は運営者が行います。広告はGoogleの承認と設定に応じて表示される場合があります。'],
      ['Publisher and production','The publisher uses the name Mainichi Toolbox. The former name was Everyday Japan Lab; its English household guides and calculators remain available. AI assists with writing, translation and code development. The publisher handles corrections and reported problems. Advertising may appear subject to Google’s approval and settings.'],
      ['运营与制作','运营名称为“每日工具箱”，旧称Everyday Japan Lab，原有的英文生活指南和计算工具仍可使用。内容、翻译及代码开发使用AI辅助；运营者负责更正和处理反馈。广告是否展示取决于Google审核及相关设置。'],
      ['Responsable y elaboración','La web se publica como Mainichi Toolbox, antes Everyday Japan Lab. Conserva las guías domésticas y calculadoras en inglés. Se utiliza asistencia de IA para redacción, traducción y código. El responsable atiende las correcciones y problemas. La publicidad depende de la aprobación y configuración de Google.']
    ]
  ],
  contact: [
    [
      ['お問い合わせ先','運営：まいにち道具箱。ゲームの不具合、説明の誤り、プライバシーや掲載内容についてのご連絡は、下記のメールアドレスへお願いします。メールリンクを押すと、お使いのメールアプリが開きます。自動送信はしません。'],
      ['Contact the publisher','Publisher: Mainichi Toolbox. Use the email address below for game problems, corrections, privacy questions or concerns about published content. The email link opens your mail app; it does not send a message automatically.'],
      ['联系运营者','运营：每日工具箱。游戏故障、说明错误、隐私问题及内容相关反馈，请发送至下方邮箱。点击邮箱链接会打开你的邮件应用，不会自动发送邮件。'],
      ['Contacta con el responsable','Responsable: Mainichi Toolbox. Utiliza el correo indicado para informar de fallos, correcciones, privacidad o contenido publicado. El enlace abre tu aplicación de correo y no envía nada automáticamente.']
    ],
    [
      ['不具合を知らせるとき','ゲーム名、問題が起きたページのURL、端末とブラウザー、直前の操作、実際の表示をお知らせいただくと確認に役立ちます。画像を添える場合は氏名や通知などを隠してください。パスワード、決済情報、招待ルームの秘密のリンクは送らないでください。'],
      ['Reporting a problem','Include the game name, page URL, device and browser, steps before the problem and what appeared. Hide personal details and notifications in screenshots. Do not send passwords, payment information or private room invitation links.'],
      ['反馈故障时','请提供游戏名称、页面URL、设备与浏览器、出现问题前的操作及实际显示内容。截图前请隐藏姓名、通知等个人信息。请勿发送密码、支付信息或私人房间邀请链接。'],
      ['Para informar de un fallo','Indica el juego, la URL, dispositivo y navegador, los pasos anteriores y lo que apareció. Oculta datos personales y notificaciones en capturas. No envíes contraseñas, datos de pago ni enlaces privados de invitación.']
    ],
    [
      ['ご連絡の取り扱い','メールアドレスと本文は、返信およびお問い合わせの調査に利用します。返信時期や個別の対応はお約束できません。広告へのクリックを依頼することはありません。データの扱いはプライバシーポリシーをご覧ください。'],
      ['How enquiries are handled','Your email address and message are used to reply and investigate your enquiry. Response times and individual assistance are not guaranteed. We do not ask you to click advertisements. See the privacy policy for data handling.'],
      ['反馈处理','邮箱地址及邮件内容用于回复和调查问题，无法保证回复时间或个别协助。我们不会要求你点击广告。数据处理详情请查看隐私政策。'],
      ['Tratamiento de consultas','Tu dirección y mensaje se utilizan para responder e investigar la consulta. No se garantiza un plazo de respuesta ni asistencia individual. No pedimos clics en anuncios. Consulta la política de privacidad.']
    ]
  ],
  privacy: [
    [
      ['運営者と対象','この方針は、まいにち道具箱のBloggerサイトと、ここから読み込む作者のGitHub Pages上のゲームについて説明します。プライバシーのお問い合わせは下記メールアドレスへお願いします。'],
      ['Publisher and scope','This policy describes the Mainichi Toolbox Blogger site and the author’s games loaded from GitHub Pages. Use the email address below for privacy enquiries.'],
      ['运营者与适用范围','本政策说明每日工具箱的Blogger网站，以及从作者GitHub Pages加载的游戏。隐私问题请联系下方邮箱。'],
      ['Responsable y alcance','Esta política describe la web Blogger de Mainichi Toolbox y los juegos del autor cargados desde GitHub Pages. Para consultas de privacidad utiliza el correo indicado abajo.']
    ],
    [
      ['言語設定とゲームの記録','表示言語はブラウザーのlocalStorageに保存します。ゲームによって進行状況、設定、学習記録などを端末内に保存します。保存される項目や消去・バックアップ方法はゲームごとに異なります。ブラウザーのサイトデータを消すと記録も失われることがあります。端末間の自動同期は保証しません。埋め込み表示と別タブで保存領域が異なる場合があります。'],
      ['Language and game records','The selected language is stored in browser localStorage. Individual games may store progress, settings and learning records on your device. Data, reset and backup options vary by game. Clearing site data may erase records; automatic synchronization between devices is not guaranteed. Embedded and separate-tab storage may differ.'],
      ['语言与游戏记录','语言选择保存在浏览器localStorage中。各游戏可能在设备内保存进度、设置和学习记录。保存项目、清除和备份方式因游戏而异。清除网站数据可能删除记录，不保证跨设备自动同步；嵌入页面与独立标签页的存储空间也可能不同。'],
      ['Idioma y registros de juego','El idioma elegido se guarda en localStorage del navegador. Los juegos pueden guardar progreso, ajustes y aprendizaje en el dispositivo. Los datos y opciones de borrado y copia varían por juego. Borrar datos del sitio puede eliminar registros; no se garantiza sincronización entre dispositivos. El almacenamiento integrado puede diferir del de otra pestaña.']
    ],
    [
      ['ゲーム内の通信と外部サービス','ページはGoogleのBlogger、ゲームはGitHub Pagesから配信します。一部のゲームはGoogle Fontsを読み込みます。これらのサービスにはIPアドレス、ブラウザー情報、アクセス先などの通信情報が伝わる場合があります。都道府県ドラフトの招待ルーム機能を使うと、Supabaseを通じて部屋・参加者名・対戦状態などを共有します。秘密の招待リンクを公開せず、参加名には本名などを使わないことをおすすめします。ルームのアクセス期限は保存データの自動削除を意味しません。通常の生活計算ツールの入力値を、運営者が広告のために収集する仕組みは設けていません。'],
      ['Game connections and external services','Google Blogger serves the site and GitHub Pages serves the games. Some games load Google Fonts. These services may receive IP addresses, browser details and requested pages. The Prefecture Draft invitation-room feature uses Supabase to share room data, player names and match state. Keep invitation links private and avoid real names as player names. A room’s access expiry does not mean automatic deletion of stored data. We have not implemented collection of household-calculator inputs for advertising.'],
      ['游戏通信与外部服务','网站由Google Blogger托管，游戏通过GitHub Pages提供；部分游戏加载Google Fonts。这些服务可能接收IP地址、浏览器信息和访问页面等通信信息。都道府县选秀的邀请房间通过Supabase共享房间资料、玩家名和对局状态。请勿公开私人邀请链接，建议不使用真实姓名。访问期限结束不代表已保存数据自动删除。本站未设置为广告收集生活计算器输入值的机制。'],
      ['Conexiones y servicios externos','Google Blogger aloja la web y GitHub Pages sirve los juegos. Algunos cargan Google Fonts. Estos servicios pueden recibir la dirección IP, datos del navegador y páginas solicitadas. Las salas de Prefecture Draft usan Supabase para compartir la sala, nombres y estado de partida. Mantén privados los enlaces y evita nombres reales. El vencimiento del acceso no implica borrar los datos almacenados. No hemos implementado la recogida de entradas de las calculadoras domésticas para publicidad.']
    ],
    [
      ['広告とCookie','Google AdSenseに接続していますが、コードが存在することは承認済みを意味しません。広告が配信される場合、Googleおよび第三者配信事業者はCookieやウェブビーコン等を使い、このサイトや他のサイトへの過去のアクセスに基づいて広告を表示する場合があります。広告配信・効果測定・不正防止のため、IPアドレスやブラウザー情報などを処理する場合があります。Googleと提携事業者のデータ利用は下記リンクをご確認ください。'],
      ['Advertising and cookies','The site is connected to Google AdSense; code presence does not establish approval. When ads operate, Google and third-party advertising providers may use cookies, web beacons and similar technology to serve ads based on visits to this and other sites. IP addresses and browser details may be processed for ad delivery, measurement and fraud prevention. See the linked information about Google and its partners’ data use.'],
      ['广告与Cookie','本站已连接Google AdSense，但存在代码不等于审核通过。投放广告时，Google及第三方广告提供商可能使用Cookie、网络信标等技术，根据你此前访问本站及其他网站的情况展示广告，并为投放、衡量效果及防欺诈处理IP地址和浏览器信息。Google及合作方的数据使用详情见下方链接。'],
      ['Publicidad y cookies','La web está conectada a Google AdSense; tener el código no implica aprobación. Cuando se muestran anuncios, Google y proveedores terceros pueden utilizar cookies, balizas web y tecnologías similares para mostrar publicidad basada en visitas a esta y otras webs. Pueden tratar IP y datos del navegador para difusión, medición y prevención del fraude. Consulta los enlaces sobre el uso de datos por Google y sus socios.']
    ],
    [
      ['広告とCookieの選択','パーソナライズド広告はGoogleのMy Ad Centerで管理できます。参加する第三者事業者についてはYourAdChoicesも利用できます。必要な地域で同意画面が表示された場合は、その画面から同意・拒否・管理を選択してください。ブラウザーでもCookieを制御できます。これらの操作はすべての広告を止めるものではなく、Cookieの削除で同意状態も失われる場合があります。'],
      ['Your choices','Manage personalized advertising in Google My Ad Center or participating third-party choices through YourAdChoices. Where a consent message is displayed, use it to accept, decline or manage consent. Your browser also offers cookie controls. These choices do not necessarily stop all ads, and clearing cookies may erase consent preferences.'],
      ['你的选择','可通过Google My Ad Center管理个性化广告，也可通过YourAdChoices管理参与其中的第三方选择。若所在地区显示同意提示，可在提示中接受、拒绝或管理同意。浏览器也可控制Cookie。这些选择不一定停止所有广告，清除Cookie也可能删除同意偏好。'],
      ['Tus opciones','Gestiona la publicidad personalizada en My Ad Center de Google o las opciones de terceros participantes en YourAdChoices. Si aparece un mensaje de consentimiento, permite aceptar, rechazar o gestionar la elección. El navegador también ofrece controles de cookies. Estas opciones no eliminan necesariamente toda publicidad; borrar cookies puede borrar el consentimiento guardado.']
    ],
    [
      ['お問い合わせ・コメント・アクセス情報','メールを送るとメールアドレスと本文を受信し、返信と調査に使います。Gmailで取り扱います。公開コメントを利用すると、Bloggerの機能に応じて名前や投稿内容が表示されます。公開したくない情報は書かないでください。Bloggerには標準のアクセス統計があり、広告サービスも独自に測定する場合があります。運営者による追加のGA4導入はしていません。'],
      ['Enquiries, comments and site information','Email enquiries provide us with your address and message for replying and investigation, handled through Gmail. Public comments can display your name and content through Blogger; do not post private information. Blogger provides built-in traffic statistics, and ad services may perform their own measurement. The publisher has not added GA4.'],
      ['邮件、评论及访问资料','发送邮件后，我们会收到邮箱地址和正文，用于回复与调查，并通过Gmail处理。公开评论可能通过Blogger显示姓名和内容，请勿发布私人信息。Blogger提供内置访问统计，广告服务也可能独立进行衡量。运营者未额外安装GA4。'],
      ['Consultas, comentarios y visitas','Al escribirnos recibimos tu dirección y mensaje para responder e investigar, mediante Gmail. Los comentarios públicos pueden mostrar nombre y contenido en Blogger: no publiques información privada. Blogger incluye estadísticas de visitas y los servicios de anuncios pueden realizar sus propias mediciones. El responsable no ha añadido GA4.']
    ],
    [
      ['外部リンクと方針の更新','外部サイトには、それぞれのプライバシー方針が適用されます。サービスや保存方法を変更するときは、このページの説明と更新日を見直します。プライバシーに関するご質問や訂正のご連絡は下記窓口へお願いします。'],
      ['External links and updates','External sites apply their own privacy policies. We revise this page and its date when services or storage practices change. Contact the address below for privacy questions or corrections.'],
      ['外部链接与政策更新','外部网站适用各自的隐私政策。服务或存储方式变化时，我们会更新本页说明及日期。隐私问题或更正请求请联系下方邮箱。'],
      ['Enlaces externos y actualizaciones','Las webs externas aplican sus propias políticas. Revisamos esta página y su fecha cuando cambian los servicios o el almacenamiento. Contacta con el correo indicado para preguntas o correcciones.']
    ]
  ],
  advertising: [
    [
      ['広告の掲載について','まいにち道具箱は、無料のゲームとツールを継続して提供するため、Google AdSenseの利用を申請しています。広告の表示はGoogleの承認と設定に従います。申請中であることや広告コードがあることは、承認や収益を保証するものではありません。'],
      ['Advertising on this site','Mainichi Toolbox has applied to use Google AdSense to support its free games and tools. Ads depend on Google’s approval and settings. Applying or including ad code does not guarantee approval or income.'],
      ['本站广告','每日工具箱已申请使用Google AdSense，以支持免费游戏和工具的持续提供。广告展示取决于Google审核和设置；申请中或存在代码并不保证通过或收益。'],
      ['Publicidad en esta web','Mainichi Toolbox ha solicitado Google AdSense para sostener sus juegos y herramientas gratuitos. Los anuncios dependen de la aprobación y ajustes de Google. Solicitarlo o incluir código no garantiza aprobación ni ingresos.']
    ],
    [
      ['ゲーム操作と広告を区別します','広告はゲームの開始ボタン、操作部品、計算結果と区別できるように扱います。広告を押すことをゲームの利用条件にしたり、応援のためのクリックをお願いしたりはしません。誤って押しやすい表示に気づいた場合はお問い合わせください。'],
      ['Keeping ads distinct from controls','Advertisements must be distinguishable from game launch buttons, controls and calculator results. Clicking an ad is not a condition of playing, and we do not request support clicks. Report any placement that makes accidental clicks likely.'],
      ['区分广告与操作','广告应与游戏开始按钮、操作控件及计算结果清晰区分。点击广告不是游戏使用条件，我们也不会请求“支持式”点击。若发现容易误触的展示，请联系我们。'],
      ['Distinguir anuncios y controles','Los anuncios deben distinguirse de botones de juego, controles y resultados. Pulsarlos no es condición para jugar y no pedimos clics de apoyo. Informa si una ubicación facilita los clics accidentales.']
    ],
    [
      ['紹介リンクとデータの扱い','現在、有料のアフィリエイトリンクやスポンサー記事は掲載していません。将来、広告・提供・アフィリエイト関係を設ける場合は、対象の近くで明示します。通常の参考リンクやゲームへのリンクが、広告であるとは限りません。Cookieと広告の選択はプライバシーポリシーをご確認ください。'],
      ['Links and data','There are currently no paid affiliate links or sponsored articles. Any future advertising, sponsorship or affiliate relationship will be disclosed near the relevant content. Reference and game links are not necessarily advertisements. See the privacy policy for cookies and advertising choices.'],
      ['链接与数据','目前没有付费联盟链接或赞助文章。未来若有广告、赞助或联盟关系，会在相关内容附近标明。普通参考链接和游戏链接不一定是广告。Cookie和广告选择详见隐私政策。'],
      ['Enlaces y datos','Actualmente no hay enlaces de afiliación pagados ni artículos patrocinados. Las futuras relaciones comerciales se identificarán cerca del contenido correspondiente. Los enlaces de referencia y juegos no son necesariamente anuncios. Consulta la política de privacidad para cookies y opciones publicitarias.']
    ]
  ],
  methodology: [
    [
      ['遊び方とデータの確認','ゲーム紹介は、各ゲームの操作説明やソースを参照して作成します。画面やルールを変更したときは紹介も見直します。地理・言葉のクイズは学習のきっかけとして利用し、公的な判断には出典の原資料を確認してください。都道府県ドラフトの能力値はゲーム用の設定です。'],
      ['Instructions and data','Game introductions are based on their instructions and source. We revise them as interfaces or rules change. Geography and language quizzes are starting points for learning; consult original sources for official decisions. Prefecture Draft attributes are game settings.'],
      ['玩法与数据','游戏介绍参考各游戏的操作说明和源代码；界面或规则变化时，也会检查介绍。地理及词语问答用于启发学习；正式判断请查阅原始来源。都道府县选秀的能力值属于游戏设定。'],
      ['Instrucciones y datos','Las introducciones se basan en las instrucciones y el código de los juegos y se revisan cuando cambian. Los cuestionarios sirven para aprender; consulta las fuentes originales para decisiones oficiales. Los atributos de Prefecture Draft son ajustes del juego.']
    ],
    [
      ['制作・翻訳・修正','文章、翻訳、コード制作にはAIの補助を利用しています。AIの出力だけを正しさの根拠にせず、ゲームの動作や原資料と照合します。誤訳や不具合のご連絡は、対象のURLと問題の表示を添えてお問い合わせください。ゲーム内の日本語のお題は、表示言語を変えても翻訳されない場合があります。'],
      ['Production, translation and corrections','AI assists with text, translation and coding. AI output alone is not evidence; we check against game behavior and original materials. Report errors with the URL and affected text or behavior. Japanese game topics may remain untranslated when the interface language changes.'],
      ['制作、翻译与更正','文章、翻译和代码使用AI辅助。AI输出本身不构成正确性的证据，我们会对照游戏表现及原始资料。反馈错误时，请附上URL和有问题的文字或现象。切换界面语言后，日语题目可能仍保留日语。'],
      ['Elaboración, traducción y correcciones','Se utiliza IA como ayuda para texto, traducción y código, no como prueba por sí sola. Contrastamos con el juego y las fuentes. Informa de errores indicando URL y texto o comportamiento. Los temas japoneses pueden conservar su idioma aunque cambien los controles.']
    ],
    [
      ['以前の暮らしのガイドについて','旧Everyday Japan Labの英語ガイドは、公開資料やメーカー資料を参照した調査記事です。実機での使用試験や設置の認証をしたものではありません。計算例には前提条件があり、製品の適合・実際の消費電力・災害への備えを保証しません。購入や工事の前には最新の説明書と地域の条件を確認してください。'],
      ['Earlier household guides','The former Everyday Japan Lab guides are English desk research based on public and manufacturer sources, not hands-on tests or installation certification. Calculations use stated assumptions and do not establish fit, real energy use or emergency readiness. Check current manuals and local requirements before purchases or work.'],
      ['原有生活指南','旧Everyday Japan Lab的英文指南是基于公开及厂商资料的案头研究，并非实物测试或安装认证。计算示例有特定前提，不能保证产品适配、实际能耗或应急准备充分。购买或施工前请查看最新说明书和当地要求。'],
      ['Guías domésticas anteriores','Las guías en inglés de Everyday Japan Lab son investigación documental con fuentes públicas y de fabricantes, no pruebas físicas ni certificaciones. Los cálculos parten de supuestos y no garantizan compatibilidad, consumo real ni preparación ante emergencias. Consulta manuales y requisitos locales actuales.']
    ]
  ]
};
const titles = {
  topics:['ゲームの遊び方・読みもの','How to play and guides','游戏玩法与指南','Cómo jugar y guías'],
  about:['このサイトについて','About this site','关于本站','Acerca de esta web'],
  contact:['お問い合わせ','Contact','联系我们','Contacto'],
  privacy:['プライバシーポリシー','Privacy policy','隐私政策','Política de privacidad'],
  advertising:['広告について','Advertising','广告说明','Publicidad'],
  methodology:['制作・調査方針','Production and research','制作与调查方针','Elaboración e investigación']
};
pages.topics = games.map(game => langs.map(lang => [game.title[lang], game.description[lang]+' '+guides[game.id][lang].steps+' '+guides[game.id][lang].tip]));
const legacyGuides = [
  ['Stovetop rice','stovetop-rice'],['Bidet seats','bidet-seats'],
  ['Heat-pump water heaters','heat-pump-water-heaters'],['Emergency supplies','emergency-preparedness'],
  ['Bidet measurements','bidet-seats-measure'],['Bidet electricity and plumbing','bidet-seats-electrical-plumbing'],
  ['Heat-pump installation','heat-pump-water-heaters-installation'],['Heat-pump COP and cost','heat-pump-water-heaters-cop-and-cost'],
  ['Emergency water','emergency-preparedness-water'],['Pantry rotation','emergency-preparedness-rotation']
];
const refs = [
  ['Google Privacy','https://policies.google.com/privacy'],
  ['Google cookies','https://policies.google.com/technologies/cookies'],
  ['Google partner data use','https://policies.google.com/technologies/partner-sites'],
  ['My Ad Center','https://myadcenter.google.com/'],
  ['YourAdChoices','https://www.aboutads.info/choices/'],
  ['GitHub Privacy','https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement'],
  ['Supabase Privacy','https://supabase.com/privacy']
];
for (const [slug, rows] of Object.entries(pages)) {
  const html = `<div class="mt-info" data-mt-info="${slug}">` + langs.map((lang,i) =>
    `<section data-mt-info-lang="${lang}" data-mt-page-title="${esc(titles[slug][i])}" lang="${lang==='zh'?'zh-Hans':lang}"${i?' hidden':''}>\n` +
    `<p class="mt-info-meta">${['最終更新','Updated','更新日期','Actualizado'][i]}: 2026-11-05 · ${esc(ui[lang].brand)}</p>\n` +
    rows.map((row,n) => `<h2>${esc(row[i][0])}</h2><p>${esc(row[i][1])}</p>`+
      (slug==='topics'?`<p><a href="https://everydayjapanlab.blogspot.com/?lang=${lang}&amp;game=${games[n].id}">${esc(ui[lang].play)} → ${esc(games[n].title[lang])}</a></p>`:'')).join('\n') +
    (slug==='topics'?`<h2>${esc(ui[lang].legacy)}</h2><ul>`+legacyGuides.map(([title,slug])=>`<li><a href="https://everydayjapanlab.blogspot.com/p/${slug}.html">${esc(title)}</a></li>`).join('')+'</ul>':'')+
    (['privacy','contact'].includes(slug)?'<p><a href="mailto:tpaqgicufhco@gmail.com">tpaqgicufhco@gmail.com</a></p>':'') +
    (slug==='privacy'?'<ul>'+refs.map(([title,url])=>`<li><a href="${url}" rel="noopener noreferrer">${esc(title)}</a></li>`).join('')+'</ul>':'') +
    `<nav aria-label="${esc(ui[lang].about)}"><a href="https://everydayjapanlab.blogspot.com/?lang=${lang}#games">${esc(ui[lang].backGames)}</a> · `+
    ['topics','about','contact','privacy','advertising','methodology'].filter(s=>s!==slug).map(s=>`<a href="https://everydayjapanlab.blogspot.com/p/${s}.html?lang=${lang}">${esc(titles[s][i])}</a>`).join(' · ')+
    '</nav></section>'
  ).join('\n') + '</div>\n';
  fs.writeFileSync(path.join(out,slug+'.html'),html);
}
module.exports = {pages,titles};
console.log('Generated '+Object.keys(pages).length+' site-information pages in four languages.');
