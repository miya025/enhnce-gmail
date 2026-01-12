/**
 * Enhance Gmail Popup Script
 */

// 詳細設定を開く
document.getElementById('open-settings').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});
