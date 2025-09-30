

# golikejs（日本語）

[![npm version](https://badge.fury.io/js/golikejs.svg)](https://badge.fury.io/js/golikejs) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

golikejs は、Go の標準ライブラリの一部を JavaScript / TypeScript 向けに再実装することを目的とした小さなライブラリです。実用的な API の互換性を重視し、JS/TS 環境で Go の並行処理パターン（同期プリミティブやコンテキストのキャンセルなど）を使いやすく提供します。

目次

- 特徴
- インストール
- クイックスタート（例）
  - Mutex
  - Channel
  - Context
  - Cond
  - Semaphore
  - WaitGroup
- API サマリ
- ビルド & テスト
- パブリッシュ
- コントリビュート
- ライセンス

特徴

- Mutex, RWMutex — Go のセマンティクスに準拠した相互排他プリミティブ
- WaitGroup — 複数の非同期タスクの完了を待つユーティリティ
- Semaphore — カウントセマフォ
- Channel<T> — 非バッファ/バッファ付きチャネル（送受信セマンティクスを再現）
- Cond — 条件変数
- Context — キャンセル伝播や done/error セマンティクスを持つ Context ヘルパー

インストール

```bash
# npm
npm install golikejs

# bun
bun add golikejs
```

クイックスタート（抜粋）

Mutex

```ts
import { Mutex } from 'golikejs';

const m = new Mutex();
await m.lock();
try {
  // クリティカルセクション
} finally {
  m.unlock();
}
```

Channel（バッファ付き）

```ts
import { Channel } from 'golikejs';

const ch = new Channel<number>(3);
await ch.send(1);
const v = await ch.receive();
```

Context（キャンセル）

```ts
import { context } from 'golikejs';

const ctx = context.withCancel(context.Background());
// キャンセルを監視する実装例
const task = async (ctx) => {
  await ctx.done; // cancel されると解決される
};

ctx.cancel(new Error('shutdown'));
```

Cond

```ts
import { Cond, Mutex } from 'golikejs';

const mu = new Mutex();
const cond = new Cond(mu);

// 待機側
await mu.lock();
try {
  await cond.wait();
} finally {
  mu.unlock();
}

// シグナル送信側
await mu.lock();
try {
  cond.signal();
} finally {
  mu.unlock();
}
```

Semaphore

```ts
import { Semaphore } from 'golikejs';

const s = new Semaphore(2);
await s.acquire();
try {
  // 同時実行数制限された処理
} finally {
  s.release();
}
```

WaitGroup

```ts
import { WaitGroup } from 'golikejs';

const wg = new WaitGroup();
wg.add(1);
(async () => {
  try {
    // 作業
  } finally {
    wg.done();
  }
})();
await wg.wait();
```

API サマリ

- Mutex: `lock()`, `unlock()`, `tryLock()`
- RWMutex: `rlock()`, `runlock()`, `lock()`, `unlock()`
- WaitGroup: `add()`, `done()`, `wait()`
- Semaphore: `acquire()`, `release()`, `tryAcquire()`
- Channel<T>: `send()`, `receive()`, `trySend()`, `tryReceive()`, `close()`
- Cond: `wait()`, `signal()`, `broadcast()`
- Context モジュール: `Background()`, `withCancel()`, `withTimeout()`, `withDeadline()` など（実装の詳細はソース API を参照してください）

ビルド & テスト

- Bun を推奨しています。テストは以下で実行できます:

```bash
bun test
```

- ビルド（必要な場合）:

```bash
bun run build
```

パブリッシュ

自動パブリッシュ用の GitHub Actions ワークフローが含まれています。リリース作成や `v*` タグのプッシュで npm に公開されます。公開を有効にする手順:

1. npm にアクセスしてトークンを作成（npmjs.com の Settings → Access Tokens）。
2. GitHub のリポジトリ設定で `NPM_TOKEN` シークレットを追加する。
3. タグ（例: `v1.0.0`）を作成してプッシュ、または GitHub Release を作成します。`publish` ワークフローが実行され、npm へ公開されます。

コントリビュート

バグ報告や PR は歓迎します。提案は Issue で話し合い、変更はテストを含めて PR を作成してください。API はできるだけ Go の慣習に沿って安定させる方針です。

ライセンス

MIT

