/**
 * Enhance Gmail Popup Script
 */

// 設定を読み込み
async function loadSettings() {
    const result = await chrome.storage.sync.get('settings');
    const settings = result.settings || {};

    // UIに反映
    document.getElementById('shortcut-hints').checked = settings.showShortcutHints !== false;
    document.getElementById('notifications').checked = settings.notifications !== false;
}

// 設定を保存
async function saveSettings() {
    const settings = {
        showShortcutHints: document.getElementById('shortcut-hints').checked,
        notifications: document.getElementById('notifications').checked
    };

    await chrome.storage.sync.set({ settings });

    // Gmailタブに設定変更を通知
    const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
    for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            data: settings
        }).catch(() => { });
    }
}

// イベントリスナー設定
document.getElementById('shortcut-hints').addEventListener('change', saveSettings);
document.getElementById('notifications').addEventListener('change', saveSettings);

// 詳細設定を開く
document.getElementById('open-settings').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});

// 初期化
loadSettings();
