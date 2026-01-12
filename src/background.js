/**
 * Enhance Gmail Background Service Worker
 * バックグラウンド処理（スヌーズ管理、アラーム、通知）
 */

// 定数
const SNOOZE_CHECK_ALARM = 'zenmail-snooze-check';
const SNOOZE_LABEL = 'Enhance Gmail/Snoozed';

/**
 * 初期化
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Enhance Gmail: Extension installed/updated', details.reason);

    // スヌーズチェック用のアラームを設定（1分ごと）
    await chrome.alarms.create(SNOOZE_CHECK_ALARM, {
        periodInMinutes: 1
    });

    // デフォルト設定を保存
    if (details.reason === 'install') {
        await chrome.storage.sync.set({
            settings: {
                sendDelay: 60,
                showSendProgress: true,
                defaultSnoozeTime: '09:00',
                uiMode: 'normal',
                language: 'ja'
            }
        });
    }
});

/**
 * アラームリスナー
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === SNOOZE_CHECK_ALARM) {
        await checkSnoozedEmails();
    }
});

/**
 * メッセージリスナー
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'SNOOZE_EMAIL':
            handleSnoozeEmail(message.data, sender.tab?.id);
            break;

        case 'SEND_QUEUED':
            handleSendQueued(message.data);
            break;

        case 'GET_SETTINGS':
            chrome.storage.sync.get('settings').then(result => {
                sendResponse(result.settings || {});
            });
            return true; // 非同期レスポンス

        case 'SAVE_SETTINGS':
            chrome.storage.sync.set({ settings: message.data }).then(() => {
                sendResponse({ success: true });
            });
            return true;
    }
});

/**
 * スヌーズメールの処理
 */
async function handleSnoozeEmail(data, tabId) {
    const { snoozeUntil, label } = data;

    // スヌーズ情報をキャッシュに保存
    const cache = await getSnoozedEmailsCache();
    cache.push({
        id: Date.now().toString(),
        snoozeUntil,
        label,
        createdAt: Date.now()
    });
    await chrome.storage.local.set({ snoozedEmailsCache: cache });

    console.log('Enhance Gmail: Email snoozed until', new Date(snoozeUntil).toLocaleString());

    // スヌーズ時のアクションをContent Scriptに指示
    if (tabId) {
        chrome.tabs.sendMessage(tabId, {
            type: 'EXECUTE_SNOOZE_ACTION',
            data: { snoozeUntil, label }
        });
    }
}

/**
 * 送信キュー処理
 */
async function handleSendQueued(data) {
    console.log('Enhance Gmail: Email queued for sending', data);

    // 送信キューを保存（ブラウザクラッシュ対策）
    const queue = (await chrome.storage.local.get('sendQueue')).sendQueue || [];
    queue.push({
        ...data,
        id: Date.now().toString()
    });
    await chrome.storage.local.set({ sendQueue: queue });
}

/**
 * スヌーズメールのチェック
 */
async function checkSnoozedEmails() {
    const cache = await getSnoozedEmailsCache();
    const now = Date.now();

    const dueSnoozed = cache.filter(item => item.snoozeUntil <= now);
    const remaining = cache.filter(item => item.snoozeUntil > now);

    if (dueSnoozed.length > 0) {
        console.log('Enhance Gmail: Found', dueSnoozed.length, 'snoozed emails due');

        // Gmailタブにメッセージを送信
        const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'SNOOZE_DUE',
                data: { items: dueSnoozed }
            }).catch(() => {
                // タブがContent Scriptをロードしていない場合は無視
            });
        }

        // キャッシュを更新
        await chrome.storage.local.set({ snoozedEmailsCache: remaining });
    }
}

/**
 * スヌーズキャッシュを取得
 */
async function getSnoozedEmailsCache() {
    const result = await chrome.storage.local.get('snoozedEmailsCache');
    return result.snoozedEmailsCache || [];
}

/**
 * 起動時の処理
 */
chrome.runtime.onStartup.addListener(async () => {
    console.log('Enhance Gmail: Browser started');

    // アラームを再設定
    await chrome.alarms.create(SNOOZE_CHECK_ALARM, {
        periodInMinutes: 1
    });

    // 未送信アイテムのチェック
    const queue = (await chrome.storage.local.get('sendQueue')).sendQueue || [];
    if (queue.length > 0) {
        console.log('Enhance Gmail: Found', queue.length, 'unsent emails');
    }
});

console.log('Enhance Gmail: Background service worker loaded');
