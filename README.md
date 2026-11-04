# games

ゲームをまとめたリポジトリです。各フォルダが1つのゲームです。

| フォルダ | タイトル |
|---|---|
| [atama-oshiri](atama-oshiri/) | あたまとおしり |
| [Chroma-sort](Chroma-sort/) | Chroma Sort |
| [golden-week](golden-week/) | ドライブひまつぶしBOX |
| [jintori](jintori/) | 完璧な日本地図ウルフ |
| [kokon-tozai](kokon-tozai/) | 古今東西ドライブ |
| [kotowaza](kotowaza/) | ことばクエスト 〜慣用句・ことわざ・古事成語バトル〜 |
| [lunch-roulette](lunch-roulette/) | ランチルーレット |
| [nazonazo-kids](nazonazo-kids/) | 小4なぞなぞ探偵団 |
| [nihon-meguri-47](nihon-meguri-47/) | 日本めぐり47 ｜ 都道府県クイズ |
| [pokemon-quiz-app](pokemon-quiz-app/) | ポケモン当てクイズ & 全国図鑑 |
| [react-game](react-game/) | 反射神経ゲーム |
| [rin-harbor](rin-harbor/) | リンハーバー |
| [todofuken-draft](todofuken-draft/) | 都道府県ドラフトバトル｜地元も、切り札も。キミが指名。 |
| [WaterSortPuzzle](WaterSortPuzzle/) | Water Sort Puzzle |
| [word-wolf](word-wolf/) | ワードウルフ |
| [word-wolf2](word-wolf2/) | ワードウルフ |
| [yakitori](yakitori/) | やきとり ならべ |

各ゲームは元のリポジトリからコピーしたものです（`atama-oshiri` と `yakitori` は `launch-roulette` リポジトリ内から）。

## まいにち道具箱（公開ポータル）

公開サイト: https://everydayjapanlab.blogspot.com/  
GitHub Pages版: https://kouheim1979.github.io/games/

日本語・英語・簡体字中国語・スペイン語でサイトの案内、検索、ゲーム紹介を切り替えられます。各ゲーム内の文章・問題は元の言語です。

サイトに載せるゲームは `portal/catalog.js` で管理します。所有者の指示により `kokon-tozai`、`golden-week`、`lunch-roulette` は公開ポータルから除外し、各ゲームの元ファイルは残しています。掲載ゲームは14本です。

```sh
node portal/build.cjs
node --test tests/portal.test.cjs
```

`deployment/blogger-widget.html` はBloggerの既存HTML/JavaScriptガジェットに反映するコードです。既存の生活ツール用CSS・計算ロジックを維持しています。変更前は `deployment/blogger-widget-before-20261104.html` に保存しています。
