/**
 * Enhance Gmail Settings Script
 */

// 設定を読み込み・UIに反映
async function loadSettings() {
    const result = await chrome.storage.sync.get('settings');
    const settings = result.settings || {};

    document.getElementById('language').value = settings.language || 'ja';

    // カスタムタブを読み込み
    loadCustomTabs(settings.customTabs || []);
}

// 設定を保存
async function saveSettings() {
    const customTabs = getCustomTabsFromUI();

    const settings = {
        language: document.getElementById('language').value,
        customTabs
    };

    await chrome.storage.sync.set({ settings });
    showSaveNotification();
}

// 保存通知を表示
function showSaveNotification() {
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = '設定を保存しました';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('visible');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// カスタムタブを読み込み
function loadCustomTabs(tabs) {
    const container = document.getElementById('custom-tabs-list');
    container.innerHTML = '';

    tabs.forEach((tab, index) => {
        addCustomTabUI(tab, index);
    });
}

// カスタムタブUIを追加
function addCustomTabUI(tab = {}, index = null) {
    const container = document.getElementById('custom-tabs-list');
    const id = index !== null ? index : container.children.length;

    const html = `
    <div class="custom-tab-item" data-id="${id}">
      <div class="custom-tab-header">
        <input type="text" class="tab-name" placeholder="タブ名" value="${tab.name || ''}">
        <input type="color" class="tab-color" value="${tab.color || '#4285f4'}">
        <button class="btn-icon btn-delete" title="削除">🗑️</button>
      </div>
      <div class="custom-tab-rule">
        <label>検索クエリ:</label>
        <input type="text" class="tab-query" placeholder="例: from:boss@company.com OR label:VIP" value="${tab.query || ''}">
      </div>
    </div>
  `;

    container.insertAdjacentHTML('beforeend', html);

    // 削除ボタンのイベント
    const item = container.lastElementChild;
    item.querySelector('.btn-delete').addEventListener('click', () => {
        item.remove();
        saveSettings();
    });

    // 変更時に保存
    item.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', saveSettings);
    });
}

// UIからカスタムタブを取得
function getCustomTabsFromUI() {
    const items = document.querySelectorAll('.custom-tab-item');
    const tabs = [];

    items.forEach(item => {
        const name = item.querySelector('.tab-name').value.trim();
        const color = item.querySelector('.tab-color').value;
        const query = item.querySelector('.tab-query').value.trim();

        if (name && query) {
            tabs.push({ name, color, query });
        }
    });

    return tabs;
}

// イベントリスナー設定
document.querySelectorAll('select').forEach(el => {
    el.addEventListener('change', saveSettings);
});

document.getElementById('add-custom-tab').addEventListener('click', () => {
    addCustomTabUI();
});

// 初期化
loadSettings();
