# Enhance Gmail

Gmail効率化Chrome拡張機能

## 🚀 機能



### アカウント切り替え
複数のGoogleアカウント間を素早く移動。
- `Shift+1~9` で直接切り替え

### カスタムタブ
検索クエリベースでメールを分類するタブを作成。
- 受信トレイ上部にタブバーを表示
- 「+」ボタンで新規タブ追加
- VIP、未読、スターなどのプリセット付き

### ショートカット学習
Gmailのキーボードショートカットを自然に習得できます。
- マウスでボタンをクリックするとヒントを表示
- 3回ショートカットを使うと習得完了

## ⌨️ ショートカット

| キー | 機能 |
|------|------|

| `Shift+1~9` | アカウント切替 |

## 📦 インストール

1. このリポジトリをクローン
2. Chrome で `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `enhance-gmail` フォルダを選択

## 🔧 技術スタック

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES2022)
- chrome.storage API

## 📁 構成

```
enhance-gmail/
├── manifest.json
├── src/
│   ├── background.js
│   ├── content.js
│   ├── popup/
│   ├── settings/
│   └── styles/
├── _locales/
└── icons/
```

## 📄 ライセンス

MIT License
