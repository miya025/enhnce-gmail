/**
 * Enhance Gmail Gmail DOM Helper
 * Gmail画面のDOM操作ユーティリティ
 */

// Gmailのセレクタ定義（Gmail UI更新時に修正しやすいよう分離）
const SELECTORS = {
    // サイドバー
    leftSidebar: '.aeN',
    rightSidebar: '.bq9',

    // Meet & Chat
    meetSection: '.aT5-aOt-I-JX-Jw',
    chatSection: '.aeN .aj5',

    // メール関連
    inboxContainer: '.AO',
    emailList: '.BltHke',
    emailRow: '.zA',
    emailThread: '.h7',

    // ボタン
    sendButton: '.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3',
    archiveButton: '[data-tooltip="アーカイブ"], [aria-label="Archive"]',
    deleteButton: '[data-tooltip="削除"], [aria-label="Delete"]',
    replyButton: '[data-tooltip="返信"], [aria-label="Reply"]',

    // 作成画面
    composeWindow: '.T-I.J-J5-Ji.T-I-KE.L3',
    composeBody: '.Am.Al.editable',
    composeSubject: 'input[name="subjectbox"]',
    composeTo: 'textarea[name="to"]',

    // ヘッダー
    header: 'header',
    searchBox: '.gb_od',

    // タブ
    tabContainer: '.aKz',
    primaryTab: '.aAy[data-tooltip="メイン"]',
};

/**
 * 要素を取得（存在確認付き）
 */
export function getElement(selector) {
    return document.querySelector(selector);
}

/**
 * 複数要素を取得
 */
export function getElements(selector) {
    return document.querySelectorAll(selector);
}

/**
 * 要素の表示/非表示を切り替え
 */
export function toggleVisibility(selector, visible) {
    const element = getElement(selector);
    if (element) {
        element.style.display = visible ? '' : 'none';
    }
}

/**
 * UI簡素化モードを適用
 */
export function applyUIMode(mode) {
    const body = document.body;

    // 既存のモードクラスを削除
    body.classList.remove('zenmail-mode-simple', 'zenmail-mode-zen');

    if (mode === 'simple') {
        body.classList.add('zenmail-mode-simple');
    } else if (mode === 'zen') {
        body.classList.add('zenmail-mode-zen');
    }
}

/**
 * 選択中のメールスレッドIDを取得
 */
export function getSelectedThreadIds() {
    const selectedRows = getElements('.zA.x7');
    const threadIds = [];

    selectedRows.forEach(row => {
        const threadId = row.getAttribute('data-thread-id');
        if (threadId) {
            threadIds.push(threadId);
        }
    });

    return threadIds;
}

/**
 * 現在開いているメールのスレッドIDを取得
 */
export function getCurrentThreadId() {
    const url = window.location.href;
    const match = url.match(/#(?:inbox|all|sent|drafts)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

/**
 * 現在のGmailアカウント番号を取得
 */
export function getCurrentAccountIndex() {
    const url = window.location.href;
    const match = url.match(/\/mail\/u\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

/**
 * アカウントを切り替え
 */
export function switchAccount(index) {
    const currentUrl = window.location.href;
    const newUrl = currentUrl.replace(/\/mail\/u\/\d+/, `/mail/u/${index}`);
    window.location.href = newUrl;
}

/**
 * トースト通知を表示
 */
export function showToast(message, duration = 3000) {
    // 既存のトーストを削除
    const existingToast = document.querySelector('.zenmail-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'zenmail-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // アニメーション
    requestAnimationFrame(() => {
        toast.classList.add('zenmail-toast-visible');
    });

    setTimeout(() => {
        toast.classList.remove('zenmail-toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * モーダルダイアログを表示
 */
export function showModal(options) {
    const { title, content, onConfirm, onCancel } = options;

    const overlay = document.createElement('div');
    overlay.className = 'zenmail-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'zenmail-modal';
    modal.innerHTML = `
    <div class="zenmail-modal-header">${title}</div>
    <div class="zenmail-modal-content">${content}</div>
    <div class="zenmail-modal-actions">
      <button class="zenmail-btn zenmail-btn-secondary" data-action="cancel">キャンセル</button>
      <button class="zenmail-btn zenmail-btn-primary" data-action="confirm">確認</button>
    </div>
  `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // イベントリスナー
    const handleClick = (e) => {
        const action = e.target.dataset.action;
        if (action === 'confirm') {
            onConfirm?.();
            overlay.remove();
        } else if (action === 'cancel' || e.target === overlay) {
            onCancel?.();
            overlay.remove();
        }
    };

    overlay.addEventListener('click', handleClick);

    // ESCキーで閉じる
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            onCancel?.();
            overlay.remove();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);

    // フォーカス
    modal.querySelector('.zenmail-btn-primary').focus();

    return overlay;
}

/**
 * スヌーズ入力ダイアログを表示
 */
export function showSnoozeDialog() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'zenmail-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'zenmail-modal zenmail-snooze-modal';
        modal.innerHTML = `
      <div class="zenmail-modal-header">スヌーズ</div>
      <div class="zenmail-modal-content">
        <input type="text" class="zenmail-snooze-input" placeholder="例: 明日, 2時間後, 来週の月曜" autofocus>
        <div class="zenmail-snooze-suggestions">
          <button data-value="明日の朝">明日の朝 (9:00)</button>
          <button data-value="明日の午後">明日の午後 (14:00)</button>
          <button data-value="今夜">今夜 (19:00)</button>
          <button data-value="来週">来週の月曜</button>
        </div>
        <div class="zenmail-snooze-preview"></div>
      </div>
      <div class="zenmail-modal-actions">
        <button class="zenmail-btn zenmail-btn-secondary" data-action="cancel">キャンセル</button>
        <button class="zenmail-btn zenmail-btn-primary" data-action="confirm">スヌーズ</button>
      </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const input = modal.querySelector('.zenmail-snooze-input');
        const preview = modal.querySelector('.zenmail-snooze-preview');

        // 候補ボタンのクリック
        modal.querySelectorAll('.zenmail-snooze-suggestions button').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.value;
                input.dispatchEvent(new Event('input'));
            });
        });

        // 入力時のプレビュー更新
        input.addEventListener('input', async () => {
            const { parseNaturalLanguage } = await import('./parser.js');
            const result = parseNaturalLanguage(input.value);
            if (result) {
                preview.textContent = `→ ${result.label}`;
                preview.classList.add('valid');
            } else {
                preview.textContent = input.value ? '認識できません' : '';
                preview.classList.remove('valid');
            }
        });

        // 確認・キャンセル
        const handleAction = async (action) => {
            if (action === 'confirm') {
                const { parseNaturalLanguage } = await import('./parser.js');
                const result = parseNaturalLanguage(input.value);
                overlay.remove();
                resolve(result);
            } else {
                overlay.remove();
                resolve(null);
            }
        };

        modal.querySelector('[data-action="confirm"]').addEventListener('click', () => handleAction('confirm'));
        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => handleAction('cancel'));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) handleAction('cancel');
        });

        // Enterキーで確認
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAction('confirm');
            if (e.key === 'Escape') handleAction('cancel');
        });

        input.focus();
    });
}

/**
 * 送信取り消しUIを表示
 */
export function showSendCancelUI(options) {
    const { duration, onCancel, onComplete } = options;

    const bar = document.createElement('div');
    bar.className = 'zenmail-send-cancel-bar';
    bar.innerHTML = `
    <div class="zenmail-send-cancel-content">
      <span class="zenmail-send-cancel-text">送信中... あと <span class="zenmail-send-cancel-countdown">${duration}</span>秒</span>
      <button class="zenmail-btn zenmail-btn-cancel">取り消し (⌘Z)</button>
      <div class="zenmail-send-cancel-progress">
        <div class="zenmail-send-cancel-progress-bar"></div>
      </div>
    </div>
  `;

    document.body.appendChild(bar);

    const countdownEl = bar.querySelector('.zenmail-send-cancel-countdown');
    const progressBar = bar.querySelector('.zenmail-send-cancel-progress-bar');
    const cancelBtn = bar.querySelector('.zenmail-btn-cancel');

    let remaining = duration;
    let cancelled = false;

    // プログレスバーアニメーション
    progressBar.style.transition = `width ${duration}s linear`;
    requestAnimationFrame(() => {
        progressBar.style.width = '0%';
    });

    // カウントダウン
    const interval = setInterval(() => {
        remaining--;
        countdownEl.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(interval);
            bar.remove();
            if (!cancelled) {
                onComplete?.();
            }
        }
    }, 1000);

    // キャンセル処理
    const cancel = () => {
        cancelled = true;
        clearInterval(interval);
        bar.remove();
        onCancel?.();
        showToast('送信を取り消しました');
    };

    cancelBtn.addEventListener('click', cancel);

    // Cmd+Z でキャンセル
    const handleKeydown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            cancel();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);

    return { cancel };
}

/**
 * ショートカットヒントを表示
 */
export function showShortcutHint(element, shortcut, action) {
    const hint = document.createElement('div');
    hint.className = 'zenmail-shortcut-hint';
    hint.innerHTML = `💡 次回は <kbd>${shortcut}</kbd> キーで${action}できます`;

    const rect = element.getBoundingClientRect();
    hint.style.top = `${rect.bottom + 8}px`;
    hint.style.left = `${rect.left}px`;

    document.body.appendChild(hint);

    requestAnimationFrame(() => {
        hint.classList.add('zenmail-shortcut-hint-visible');
    });

    setTimeout(() => {
        hint.classList.remove('zenmail-shortcut-hint-visible');
        setTimeout(() => hint.remove(), 300);
    }, 3000);
}

export { SELECTORS };
