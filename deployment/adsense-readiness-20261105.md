# AdSense 再申請の準備記録

確認日：2026-11-05（日本時間）。対象：https://everydayjapanlab.blogspot.com/

## 公開済みの変更

- `pokemon-quiz-app` を公開ポータルと遊び方ページから除外。掲載12本。以前の除外4本とワードウルフ2のみの指定を維持。ゲームの元ファイルは削除していない。
- 掲載12本の遊び方・ヒントを4言語で追加。ゲームカードとBloggerのネイティブ本文 `/p/topics.html` に掲載。
- `/p/about.html`、`/p/contact.html`、`/p/privacy.html`、`/p/advertising.html`、`/p/methodology.html` を現在のサイトに合わせて更新。これらの本文も4言語切り替えに対応。
- プライバシー方針に言語設定・ゲーム記録、GitHub Pages、Google Fonts、招待ルームのSupabase通信、問い合わせ・コメント、広告Cookie、広告選択を記載。AdSenseコードの存在を承認済みと誤認させる旧説明は削除。
- 検索向け説明を有効にして日本語の紹介文を設定。Bloggerの基本言語を日本語に変更。

## 確認結果

- 公開ホームで12枚のゲームカード、12個の遊び方、ポケモンと廃止コーナーの非掲載を確認。
- サイト情報6ページの公開URL・4言語の本文を確認。遊び方ページで英語・中国語・スペイン語・日本語への切り替えとゲームリンクの言語引き継ぎを確認。
- ホームページに横方向のはみ出しがないことと検索用descriptionの公開反映を確認。
- 公開・検索エンジン表示・HTTPSリダイレクトは有効。
- `/ads.txt` は `google.com, pub-3839032295690316, DIRECT, f08c47fec0942fa0` を公開している。Bloggerの既存連携による配信を維持し、カスタムads.txtへの置換は行っていない。
- `/robots.txt` でMediapartners-Googleは禁止されていない。一般クローラーもホーム・ページを取得できる設定。
- 公開DOMではAdSense配信用scriptは確認できず、Bloggerは広告なしを表示。既存のアカウント連携とads.txtは確認できた。広告の自動配信を新しく有効にはしていない。
- `node --test tests/portal.test.cjs`：6件成功。

## AdSense管理画面で残る確認

AdSenseはアカウント選択のサインアウト画面になり、管理画面の最新情報は確認できていない。Bloggerの収益画面には「審査中」と「対応が必要」が併記されているため、どちらか一方を最新の審査状態と断定していない。

10月20日（日本時間）の不承認メールは確認済みだが、具体的な理由は管理画面の確認を求める一般的な文面だった。ログイン後に対象サイトの最新の指摘、再審査可能日、サイト接続の確認方法、同意管理設定を確認する。必要なら追加修正してから審査をリクエストする。再申請は送信していない。承認や収益は保証しない。

参考：
- https://support.google.com/adsense/answer/7584263?hl=ja
- https://support.google.com/adsense/answer/12176698?hl=ja
- https://support.google.com/adsense/answer/1348695?hl=ja

## 更新と復元

`node portal/pages.cjs`、`node portal/build.cjs`、`node --test tests/portal.test.cjs` の順で実行する。Bloggerへの反映は `deployment/pages/*.html` と `deployment/blogger-widget.html` を使用する。本文の元URLは維持する。

変更前の本文は `deployment/pages-before-20261105/` に保存。Aboutの控えは本文テキスト、他の5ページはHTML。旧ホーム用ガジェットの控えも既存の `blogger-widget-before-20261104.html` を維持する。
