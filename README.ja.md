
# golikejs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Go の標準パッケージで提供される機能を、JavaScript / TypeScript ランタイム向けに再実装したライブラリです。

golikejs は、Go で馴染みのある設計を JavaScript / TypeScript でそのまま使えることを目的としたライブラリです。Go 標準ライブラリとの実用的な API 互換性を重視し、並行処理プリミティブや読み書き処理などを提供します。

## パッケージ

- **[sync](./src/sync/)** — 排他制御処理、待ち合わせ、条件変数などの同期プリミティブ
- **[context](./src/context/)** — キャンセルやタイムアウトを伝播するコンテキスト
- **[bytes](./src/bytes/)** — バッファおよびバイト操作のためのユーティリティ
- **[io](./src/io/)** — 読み込み、書き込み操作のための実装とインターフェース

## インストール

| パッケージマネージャー | コマンド |
| --- | --- |
| Deno | `deno add jsr:@okudai/golikejs` |
| npm | `npx jsr add @okudai/golikejs` |
| pnpm | `pnpm i jsr:@okudai/golikejs` |
| Bun | `bunx jsr add @okudai/golikejs` |
| yarn | `yarn add jsr:@okudai/golikejs` |
| vlt | `vlt install jsr:@okudai/golikejs` |

### クイックスタート

```ts
import { Mutex } from 'jsr:@okudai/golikejs/sync';

const m = new Mutex();
await m.lock();
try {
  // クリティカルセクション
} finally {
  m.unlock();
}
```

より詳しい使用例や API の説明は、各パッケージ配下の `README.md` をご参照ください。

## 開発

本プロジェクトは、開発・テスト環境にDenoを使っています。

### 前提条件

- [Deno](https://deno.land/) 2.x 以上

### コマンド

| タスク | コマンド |
| --- | --- |
| テスト | `deno task test` |
| カバレッジ付きテスト | `deno task test:coverage` |
| コード整形 | `deno task fmt` |
| Lint（静的解析） | `deno task lint` |
| 型チェック | `deno task check` |

## 貢献

貢献に関するガイドラインは、[CONTRIBUTING.md](./CONTRIBUTING.md) をご参照ください。

## ライセンス

ライセンスの詳細は、[LICENSE](./LICENSE) をご確認ください。

