/**
 * Enhance Gmail Storage Utility
 * chrome.storage.sync/local のラッパー
 */

// デフォルト設定
const DEFAULT_SETTINGS = {
  // 送信取り消し設定
  sendDelay: 60, // 秒
  showSendProgress: true,
  
  // スヌーズ設定
  defaultSnoozeTime: '09:00',
  
  // UI簡素化モード
  uiMode: 'normal', // 'normal', 'simple', 'zen'
  
  // ショートカット学習
  showShortcutHints: true,
  
  // 通知
  notifications: true,
  
  // 言語
  language: 'ja'
};

/**
 * 設定を取得
 */
export async function getSettings() {
  try {
    const result = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...result.settings };
  } catch (error) {
    console.error('Enhance Gmail: Settings load error', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 設定を保存
 */
export async function saveSettings(settings) {
  try {
    const current = await getSettings();
    const merged = { ...current, ...settings };
    await chrome.storage.sync.set({ settings: merged });
    return merged;
  } catch (error) {
    console.error('Enhance Gmail: Settings save error', error);
    throw error;
  }
}

/**
 * ローカルデータを取得
 */
export async function getLocalData(key) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key];
  } catch (error) {
    console.error('Enhance Gmail: Local data load error', error);
    return null;
  }
}

/**
 * ローカルデータを保存
 */
export async function saveLocalData(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.error('Enhance Gmail: Local data save error', error);
    throw error;
  }
}

/**
 * 送信キューを取得
 */
export async function getSendQueue() {
  return (await getLocalData('sendQueue')) || [];
}

/**
 * 送信キューに追加
 */
export async function addToSendQueue(email) {
  const queue = await getSendQueue();
  queue.push({
    id: Date.now().toString(),
    ...email,
    scheduledAt: Date.now() + (await getSettings()).sendDelay * 1000
  });
  await saveLocalData('sendQueue', queue);
  return queue[queue.length - 1];
}

/**
 * 送信キューから削除
 */
export async function removeFromSendQueue(id) {
  const queue = await getSendQueue();
  const filtered = queue.filter(item => item.id !== id);
  await saveLocalData('sendQueue', filtered);
  return filtered;
}

/**
 * ショートカット学習データを取得
 */
export async function getLearningData() {
  return (await getLocalData('learningData')) || {};
}

/**
 * ショートカット学習データを更新
 */
export async function updateLearningData(action, type) {
  const data = await getLearningData();
  if (!data[action]) {
    data[action] = {
      mouseClicks: 0,
      keyboardUses: 0,
      lastHintShown: null,
      hintCount: 0,
      learned: false
    };
  }
  
  if (type === 'mouse') {
    data[action].mouseClicks++;
  } else if (type === 'keyboard') {
    data[action].keyboardUses++;
    if (data[action].keyboardUses >= 3) {
      data[action].learned = true;
    }
  }
  
  await saveLocalData('learningData', data);
  return data[action];
}

/**
 * スヌーズ済みメールのキャッシュを取得
 */
export async function getSnoozedEmailsCache() {
  return (await getLocalData('snoozedEmailsCache')) || [];
}

/**
 * スヌーズ済みメールのキャッシュを更新
 */
export async function updateSnoozedEmailsCache(emails) {
  await saveLocalData('snoozedEmailsCache', emails);
}
