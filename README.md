# Zenn用記事リポジトリ

このリポジトリは、[Blog-Project](https://github.com/SolitudeRA/Blog-Project) のサブリポジトリとして、Zenn向けの記事管理および公開を効率化するために使用されます。GitHub Actionsを活用し、記事の自動更新、シリーズリンク生成、公開プロセスを自動化します。

---

## 特徴

- **Zenn記事管理**  
  Zenn用の記事の自動更新、シリーズリンクの生成、公開プロセスを一元管理。

- **自動化ワークフロー**  
  GitHub Actionsを活用し、記事の解析、リンク生成、コミット・プッシュを完全自動化。

- **シリーズリンク生成**  
  記事の `series` 情報に基づき、自動的にリンクを生成し記事に挿入します。

---

## 必要なセットアップ

### 1. **リポジトリのクローン**

以下のコマンドでリポジトリをクローンします：

```bash
git clone https://github.com/SolitudeRA/zenn-repo.git
cd zenn-repo
```

### 2. **依存パッケージのインストール**

Node.jsがインストールされていることを確認し、以下のコマンドを実行してください：

```bash
npm install
```

---

## ディレクトリ構成

```
.
├── articles/        # Zenn用の記事が格納されるディレクトリ
│   ├── .keep        # 空のディレクトリを保持するためのファイル
│   └── *.md         # Zenn用のMarkdownファイル
├── books/           # Zennで公開する本が格納されるディレクトリ
│   ├── .keep        # 空のディレクトリを保持するためのファイル
├── pre-publish/     # 公開準備中の記事が格納されるディレクトリ
├── scripts/         # 自動化スクリプト
│   ├── parse-articles.js         # 記事を解析し、公開準備を行うスクリプト
│   ├── generate-series-links.js  # シリーズリンクを生成するスクリプト
├── .github/         # GitHub Actionsの設定
│   └── workflows/
│       └── publish_articles.yml  # 記事公開を自動化するワークフロー
├── LICENSE          # ライセンスファイル
└── README.md        # このファイル
```

---

## 使用方法

### 記事を公開する手順

1. 自動的にメインリポジトリ`blog-project`のコミットから`pre-publish` に記事を追加または更新します。
2. GitHub Actions が自動的に以下の処理を実行します：
   - 記事の解析（`parse-articles.js`）。
   - シリーズリンクの生成（`generate-series-links.js`）。
   - 記事の変更内容をリポジトリにコミット＆プッシュ。

---

## GitHub Actions ワークフローの流れ

1. **記事の解析**  
   `pre-publish` に格納されている記事を解析し、公開可能な形式に変換。

2. **シリーズリンクの生成**  
   記事の `series` 情報を基にリンクを生成し、記事内に挿入。

3. **リポジトリへの更新内容をコミット＆プッシュ**  
   更新された記事を Zenn 用リポジトリにコミットし、プッシュ。

---

## 開発者向け情報

### スクリプト一覧

- **`parse-articles.js`**  
  `pre-publish` ディレクトリ内の記事を解析し、`articles` ディレクトリに移動します。

- **`generate-series-links.js`**  
  記事内のシリーズ情報を基に、シリーズリンクを生成して記事に挿入します。

### デバッグ

以下のコマンドでローカル環境でスクリプトを実行できます：

```bash
# 記事を解析
node scripts/parse-articles.js

# シリーズリンクを生成
node scripts/generate-series-links.js ./pre-publish ./articles
```

---

## ライセンス

このリポジトリは [MITライセンス](LICENSE) のもとで公開されています。