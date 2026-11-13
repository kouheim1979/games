# games

ゲームをまとめたリポジトリです。各フォルダが1つのゲームです。

| フォルダ | タイトル |
|---|---|
| [atama-oshiri](atama-oshiri/) | あたまとおしり |
| [Chroma-sort](Chroma-sort/) | Chroma Sort |
| [dopamine-overdrive](dopamine-overdrive/) | DOPAMINE OVERDRIVE（ドーパミン・オーバードライブ） |
| [golden-week](golden-week/) | ドライブひまつぶしBOX |
| [hitori-shiritori](hitori-shiritori/) | ひとりしりとり |
| [jintori](jintori/) | 完璧な日本地図ウルフ |
| [kokon-tozai](kokon-tozai/) | 古今東西ドライブ |
| [kotowaza](kotowaza/) | ことばクエスト 〜慣用句・ことわざ・古事成語バトル〜 |
| [lunch-roulette](lunch-roulette/) | ランチルーレット |
| [nazonazo-kids](nazonazo-kids/) | 小4なぞなぞ探偵団 |
| [neon-cascade](neon-cascade/) | NEON CASCADE（ネオン・カスケード） |
| [nihon-meguri-47](nihon-meguri-47/) | 日本めぐり47 ｜ 都道府県クイズ |
| [pokemon-quiz-app](pokemon-quiz-app/) | ポケモン当てクイズ & 全国図鑑 |
| [react-game](react-game/) | 反射神経ゲーム |
| [rin-harbor](rin-harbor/) | リンハーバー |
| [ryouri-shokudo](ryouri-shokudo/) | おりょうり食堂（お料理シミュレーション） |
| [todofuken-draft](todofuken-draft/) | 都道府県ドラフトバトル｜地元も、切り札も。キミが指名。 |
| [WaterSortPuzzle](WaterSortPuzzle/) | Water Sort Puzzle |
| [word-wolf](word-wolf/) | ワードウルフ |
| [word-wolf2](word-wolf2/) | ワードウルフ |
| [yakitori](yakitori/) | やきとり ならべ |

初期収録のゲームは元のリポジトリからコピーしたものです（`atama-oshiri` と `yakitori` は `launch-roulette` リポジトリ内から）。

## 診断パーク（tools/）

8問・約1分で遊べる診断アプリ12本をまとめた「診断パーク」です。一覧ページ: https://kouheim1979.github.io/games/tools/

| フォルダ | タイトル |
|---|---|
| [tools/animal](tools/animal/) | どうぶつタイプ診断 |
| [tools/zense](tools/zense/) | 前世なにもの診断 |
| [tools/onigiri](tools/onigiri/) | おにぎりの具 診断 |
| [tools/rpg-job](tools/rpg-job/) | RPG職業 診断 |
| [tools/tenki](tools/tenki/) | お天気タイプ 診断 |
| [tools/color](tools/color/) | 心のカラー 診断 |
| [tools/family-role](tools/family-role/) | 家族の中のポジション 診断 |
| [tools/study-style](tools/study-style/) | 勉強・仕事スタイル 診断 |
| [tools/todofuken](tools/todofuken/) | あなたに似ている都道府県 診断 |
| [tools/sweets](tools/sweets/) | スイーツ診断 |
| [tools/inu](tools/inu/) | もしも犬だったら？ 犬種診断 |
| [tools/kisetsu](tools/kisetsu/) | あなたにぴったりの季節 診断 |
| [tools/shinri](tools/shinri/) | 1問心理テスト（20本入り） |

各診断は外部ファイルなしの1ファイルHTMLです。問題と結果は `tools/_src/data/*.txt` に書き、`python3 tools/_src/build.py` で `tools/<id>/index.html` と一覧 `tools/index.html` を作り直します。ビルド時に、全タイプが結果として出るか・ランダム回答で1タイプに偏らないか（各7〜28%）を確認します。前回の結果だけ端末の localStorage に保存し、回答は送信しません。公開ポータル（`portal/catalog.js`）には未掲載です。

`tools/shinri/` は1問で答える心理テスト20本をまとめたアプリで、`tools/shinri/index.html` の `TESTS` を直接編集します（ビルド不要）。設定・質問・結果文はすべてこのサイト用のオリジナルで、ネットで広く出回っている定番の心理テストに似たものは使っていません。

## まいにち道具箱（公開ポータル）

公開サイト: https://everydayjapanlab.blogspot.com/  
GitHub Pages版: https://kouheim1979.github.io/games/

日本語・英語・簡体字中国語・スペイン語でサイトの案内、検索、ゲーム紹介を切り替えられます。

サイトに載せるゲームは `portal/catalog.js` で管理します。所有者の指示により `kokon-tozai`、`golden-week`、`lunch-roulette`、`word-wolf`、`pokemon-quiz-app` は公開ポータルから除外し、各ゲームの元ファイルは残しています。掲載ゲームは13本です。ワードウルフは `word-wolf2` のみ掲載します。

```sh
node portal/pages.cjs
node portal/build.cjs
node --test tests/portal.test.cjs
```

`deployment/blogger-widget.html` はBloggerの既存HTML/JavaScriptガジェットに反映するコードです。既存の生活ツール用CSS・計算ロジックを維持しています。変更前は `deployment/blogger-widget-before-20261104.html` に保存しています。

## ゲーム画面の多言語化（i18n/）

各ゲームの画面（ボタン・説明・メッセージ）は日本語・英語・簡体字中国語・スペイン語に対応しています。問題文・お題・図鑑データなどの中身は日本語のままです。

- `i18n/i18n.js` … 共通スクリプト。画面の日本語を辞書で置き換えます（後から出る表示・ダイアログ・キャンバス文字も対象）。
- `i18n/dict/<ゲーム名>.js` … ゲームごとの辞書（`"日本語": ["English", "中文", "Español"]`、`{0}` は差し込み値）。
- 言語の決め方：URLの `?lang=ja|en|zh|es` → まいにち道具箱で選んだ言語 → ブラウザーの言語。ポータルから開くと選択中の言語が渡ります。
- ゲーム単体で開いたときは左下の 🌐 から切り替えられます。
- 文言を変えたら、そのゲームの辞書も更新してください（辞書にない文はそのまま日本語で表示されます）。


## 広告申請に向けたサイト整備（2026-11-05）

ポケモン作品は権利確認が済んでいないため、公開ポータル・遊び方ページから除外しました。ゲームの元ファイルは保持しています。`portal/guides.js` に掲載ゲームの遊び方とヒントを4言語で管理し、`portal/pages.cjs` からBlogger用の運営情報・問い合わせ・プライバシー・広告方針・制作方針・遊び方ページを生成します。出力は `deployment/pages/` です。Blogger本文はHTMLビューで置き換え、既存のURLを維持します。変更前の本文は `deployment/pages-before-20261105/` に保存しています。

サイト側の整備は審査承認を保証しません。AdSense管理画面にサインインして最新の指摘と再審査可能日を確認し、準備の確認後に申請します。申請送信はこのコード変更には含まれません。
