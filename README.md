# 大富豪 2人対戦

このリポジトリは、ブラウザで動く大富豪風の2人対戦ゲームです。

## 特長
- `?player=1` / `?player=2` の別画面を使い、手札は各自のみ表示されます。
- 場の情報は常に同期され、両者が共有します。
- 同じブラウザの別タブ・別ウィンドウでプレイできます。
- 外部公開できる静的サイトとして動作するため、GitHub なしでもホストできます。

## 遊び方
1. `index.html?player=1` を開いてプレイヤー1の画面を準備します。
2. `index.html?player=2` を開いてプレイヤー2の画面を準備します。
3. 各自、手札から同じランクのカードを選択して「出す」か、「パス」します。
4. 場の枚数と強さに従って勝敗が決まります。先に手札をなくしたプレイヤーが勝ちです。

## ローカルでの実行
### ブラウザで直接開く
`index.html` をそのまま開けますが、タブ間同期を確認するならローカルサーバー推奨です。

### Python でローカルサーバーを起動
```bash
cd /workspaces/TCG_test20260531
python3 -m http.server 8000
```
ブラウザで `http://127.0.0.1:8000/index.html?player=1` と `http://127.0.0.1:8000/index.html?player=2` を開きます。

## 公開ホスティング
- このアプリは静的ファイルのみで構成されているため、Netlify、Vercel、Cloudflare Pages、Firebase Hosting など任意の静的サイトホスティングにデプロイできます。
- GitHub を使わない場合でも、一般的な静的ホスティングサービスで公開できます。

## GitHub Pages への自動デプロイ
このリポジトリには `main` への push 時に自動で `gh-pages` ブランチへデプロイする GitHub Actions ワークフローを追加しました。

- 公開先の URL: `https://noch0613.github.io/TCG_test20260531/index.html?player=1`
- プレイヤー2 用: `https://noch0613.github.io/TCG_test20260531/index.html?player=2`

> まだ GitHub Pages 側の初回デプロイが完了していない場合は、`main` への push 後にしばらく待ってからアクセスしてください。
