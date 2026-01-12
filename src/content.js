/**
 * Enhance Gmail Content Script
 * Gmail画面に注入されるメインスクリプト
 * 機能: アカウント切り替え、カスタムタブ
 */

(function () {
    'use strict';

    // ==========================================
    // Storage Utility
    // ==========================================
    const DEFAULT_SETTINGS = {
        language: 'ja',
        customTabs: [
            { name: 'VIP', color: '#ea4335', query: 'is:important' },
            { name: '未読', color: '#4285f4', query: 'is:unread' },
            { name: 'スター', color: '#fbbc04', query: 'is:starred' }
        ]
    };

    async function getSettings() {
        try {
            const result = await chrome.storage.sync.get('settings');
            return { ...DEFAULT_SETTINGS, ...result.settings };
        } catch (error) {
            console.error('Enhance Gmail: Settings load error', error);
            return DEFAULT_SETTINGS;
        }
    }

    async function saveSettings(newSettings) {
        try {
            const current = await getSettings();
            const merged = { ...current, ...newSettings };
            await chrome.storage.sync.set({ settings: merged });
            return merged;
        } catch (error) {
            console.error('Enhance Gmail: Settings save error', error);
            throw error;
        }
    }



    // ==========================================
    // UI Functions
    // ==========================================
    function showToast(message, duration = 3000) {
        const existing = document.querySelector('.enhance-gmail-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'enhance-gmail-toast';
        toast.textContent = message;
        toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #202124;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Google Sans', Roboto, sans-serif;
      z-index: 999999;
      opacity: 0;
      transition: transform 0.2s ease, opacity 0.2s ease;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
            toast.style.opacity = '1';
        });

        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ==========================================
    // Account Functions
    // ==========================================
    function getCurrentAccountIndex() {
        const match = window.location.href.match(/\/mail\/u\/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    function switchAccount(index) {
        const newUrl = window.location.href.replace(/\/mail\/u\/\d+/, `/mail/u/${index}`);
        window.location.href = newUrl;
    }

    // ==========================================
    // Custom Tabs Feature
    // ==========================================
    let customTabsContainer = null;
    let activeTabIndex = -1; // -1 = 「すべて」タブ、0以上 = カスタムタブのインデックス

    function setupCustomTabs() {
        // Gmailのタブ領域が読み込まれるのを待つ
        const checkForTabArea = setInterval(() => {
            const tabArea = document.querySelector('.aKz') || document.querySelector('.bsU');
            if (tabArea || document.querySelector('.AO')) {
                clearInterval(checkForTabArea);
                injectCustomTabsUI();
            }
        }, 500);

        // 10秒後にタイムアウト
        setTimeout(() => clearInterval(checkForTabArea), 10000);
    }

    function injectCustomTabsUI() {
        // 既存のカスタムタブコンテナがあれば削除
        if (customTabsContainer) {
            customTabsContainer.remove();
        }

        // カスタムタブ設定を取得
        const tabs = settings.customTabs || [];
        if (tabs.length === 0) return;

        // コンテナを作成
        customTabsContainer = document.createElement('div');
        customTabsContainer.className = 'enhance-gmail-custom-tabs';
        customTabsContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: #f6f8fc;
            border-bottom: 1px solid #e0e0e0;
            font-family: 'Google Sans', Roboto, sans-serif;
            overflow-x: auto;
        `;

        // 「すべて」タブ（リセット用）
        const allTab = createTabButton({
            name: 'すべて',
            color: '#5f6368',
            query: null
        });
        allTab.style.fontWeight = '500';
        customTabsContainer.appendChild(allTab);

        // 区切り線
        const divider = document.createElement('div');
        divider.style.cssText = 'width:1px;height:20px;background:#dadce0;margin:0 4px;';
        customTabsContainer.appendChild(divider);

        // カスタムタブを追加
        tabs.forEach((tab, index) => {
            const tabBtn = createTabButton(tab, index);
            customTabsContainer.appendChild(tabBtn);
        });

        // + 追加ボタン
        const addBtn = document.createElement('button');
        addBtn.className = 'enhance-gmail-tab-add';
        addBtn.textContent = '+';
        addBtn.title = '新しいタブを追加';
        addBtn.style.cssText = `
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 1px dashed #dadce0;
            background: transparent;
            color: #5f6368;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        `;
        addBtn.addEventListener('click', () => showAddTabDialog());
        addBtn.addEventListener('mouseenter', () => {
            addBtn.style.background = '#e8eaed';
            addBtn.style.borderStyle = 'solid';
        });
        addBtn.addEventListener('mouseleave', () => {
            addBtn.style.background = 'transparent';
            addBtn.style.borderStyle = 'dashed';
        });
        customTabsContainer.appendChild(addBtn);

        // Gmailのメイン領域の上に挿入
        const mainArea = document.querySelector('.AO') || document.querySelector('.nH.bkK');
        if (mainArea && mainArea.parentNode) {
            mainArea.parentNode.insertBefore(customTabsContainer, mainArea);
            console.log('Enhance Gmail: Custom tabs injected');
        }
    }

    function createTabButton(tab, index) {
        const btn = document.createElement('button');
        btn.className = 'enhance-gmail-tab-btn';
        btn.dataset.query = tab.query || '';
        btn.dataset.index = index !== undefined ? index : -1;
        btn.type = 'button';

        // ツールチップで操作ガイドを表示
        if (index !== undefined && index >= 0) {
            btn.title = `${tab.name}\n• クリック: 開く\n• 右クリック: 編集・削除`;
        } else {
            btn.title = tab.name;
        }

        const isActive = (index !== undefined && index >= 0) ? activeTabIndex === index : activeTabIndex === -1;

        btn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 16px;
            border: none;
            background: ${isActive ? tab.color + '20' : 'transparent'};
            color: ${isActive ? tab.color : '#5f6368'};
            font-size: 13px;
            font-weight: ${isActive ? '500' : '400'};
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            user-select: none;
        `;

        // カラードット（ルールがある場合またはクエリがある場合）
        if (tab.color && (tab.query || (tab.rules && tab.rules.length > 0))) {
            const dot = document.createElement('span');
            dot.style.cssText = `
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${tab.color};
                pointer-events: none;
            `;
            btn.appendChild(dot);
        }

        // タブ名
        const label = document.createElement('span');
        label.textContent = tab.name;
        label.style.pointerEvents = 'none'; // 子要素のイベントを無効化
        btn.appendChild(label);

        // ホバー効果
        btn.addEventListener('mouseenter', () => {
            const currentlyActive = (index !== undefined && index >= 0) ? activeTabIndex === index : activeTabIndex === -1;
            if (!currentlyActive) {
                btn.style.background = '#e8eaed';
            }
        });
        btn.addEventListener('mouseleave', () => {
            const currentlyActive = (index !== undefined && index >= 0) ? activeTabIndex === index : activeTabIndex === -1;
            if (!currentlyActive) {
                btn.style.background = 'transparent';
            }
        });

        // クリックで検索実行（キャプチャフェーズで処理）
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // ルールがある場合はルールベースで検索クエリを生成
            let searchQuery = tab.query;
            if (!searchQuery && tab.rules && tab.rules.length > 0) {
                // ルールからGmail検索クエリを生成
                searchQuery = generateSearchQueryFromRules(tab.rules, tab.logic);
            }

            if (searchQuery || (index === undefined || index === -1)) {
                executeTabQuery(searchQuery, tab.color);
                updateActiveTab(index !== undefined && index >= 0 ? index : -1);
            } else {
                showToast('検索クエリまたはルールを設定してください');
            }
        }, true); // キャプチャフェーズ

        // 右クリックで編集メニュー（カスタムタブのみ）
        if (index !== undefined && index >= 0) {
            btn.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                showTabContextMenu(e, tab, index);
                return false;
            }, true); // キャプチャフェーズ
        }

        return btn;
    }

    // ルールからGmail検索クエリを生成
    function generateSearchQueryFromRules(rules, logic) {
        const queries = rules.map(rule => {
            const { field, operator, value } = rule;

            switch (field) {
                case 'from':
                    return `from:${value}`;
                case 'fromName':
                    return `from:${value}`;
                case 'subject':
                    return `subject:${value}`;
                case 'snippet':
                    return `"${value}"`;
                case 'domain':
                    return `from:@${value}`;
                case 'hasAttachment':
                    return value ? 'has:attachment' : '-has:attachment';
                case 'isUnread':
                    return value ? 'is:unread' : 'is:read';
                case 'isStarred':
                    return value ? 'is:starred' : '-is:starred';
                default:
                    return '';
            }
        }).filter(q => q);

        if (queries.length === 0) return '';

        const connector = logic === 'and' ? ' ' : ' OR ';
        return queries.join(connector);
    }

    function showTabContextMenu(event, tab, index) {
        // 既存のメニューを削除
        const existing = document.querySelector('.enhance-gmail-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.className = 'enhance-gmail-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            padding: 4px 0;
            z-index: 999999;
            min-width: 120px;
            font-family: 'Google Sans', Roboto, sans-serif;
        `;
        menu.innerHTML = `
            <button class="edit-btn" style="display:block;width:100%;text-align:left;padding:8px 16px;border:none;background:transparent;cursor:pointer;font-size:13px;">編集</button>
            <button class="delete-btn" style="display:block;width:100%;text-align:left;padding:8px 16px;border:none;background:transparent;cursor:pointer;font-size:13px;color:#ea4335;">削除</button>
        `;
        document.body.appendChild(menu);

        // 編集
        menu.querySelector('.edit-btn').addEventListener('click', async () => {
            menu.remove();
            await showEditTabDialog(tab, index);
        });

        // 削除
        menu.querySelector('.delete-btn').addEventListener('click', async () => {
            menu.remove();
            if (confirm(`タブ「${tab.name}」を削除しますか？`)) {
                settings.customTabs.splice(index, 1);
                await saveSettings({ customTabs: settings.customTabs });
                injectCustomTabsUI();
                showToast(`タブ「${tab.name}」を削除しました`);
            }
        });

        // 画面クリックで閉じる
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    async function showEditTabDialog(tab, index) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999998;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 40px rgba(0,0,0,0.2);
                width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                font-family: 'Google Sans', Roboto, sans-serif;
            `;
            modal.innerHTML = `
                <div style="padding: 24px;">
                    <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;">タブを編集</h2>
                    
                    <!-- タブ名 -->
                    <div style="margin-bottom:16px;">
                        <label style="display:block;margin-bottom:4px;font-size:13px;color:#5f6368;">タブ名</label>
                        <input type="text" class="tab-name" value="${escapeHtml(tab.name)}" style="width:100%;padding:10px 12px;border:1px solid #dadce0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                    </div>
                    
                    <!-- カラー選択 -->
                    <div style="margin-bottom:20px;">
                        <label style="display:block;margin-bottom:4px;font-size:13px;color:#5f6368;">カラー</label>
                        <div class="color-options" style="display:flex;gap:8px;">
                            <button data-color="#ea4335" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#ea4335;cursor:pointer;"></button>
                            <button data-color="#4285f4" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#4285f4;cursor:pointer;"></button>
                            <button data-color="#34a853" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#34a853;cursor:pointer;"></button>
                            <button data-color="#fbbc04" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#fbbc04;cursor:pointer;"></button>
                            <button data-color="#9c27b0" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#9c27b0;cursor:pointer;"></button>
                            <button data-color="#00bcd4" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#00bcd4;cursor:pointer;"></button>
                        </div>
                    </div>
                    
                    <!-- 振り分けルール -->
                    <div style="margin-bottom:20px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                            <label style="font-size:13px;font-weight:500;color:#202124;">振り分けルール</label>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:12px;color:#5f6368;">条件:</span>
                                <select class="rule-logic" style="padding:4px 8px;border:1px solid #dadce0;border-radius:4px;font-size:12px;">
                                    <option value="or" ${tab.logic !== 'and' ? 'selected' : ''}>いずれかに一致 (OR)</option>
                                    <option value="and" ${tab.logic === 'and' ? 'selected' : ''}>すべてに一致 (AND)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="rules-container" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
                            <div class="rules-list" style="max-height:150px;overflow-y:auto;"></div>
                            
                            <div style="padding:12px;background:#f8f9fa;border-top:1px solid #e0e0e0;">
                                <div style="display:flex;gap:8px;margin-bottom:8px;">
                                    <select class="new-rule-field" style="flex:1;padding:8px;border:1px solid #dadce0;border-radius:6px;font-size:13px;">
                                        <option value="from">送信者メール</option>
                                        <option value="fromName">送信者名</option>
                                        <option value="subject">件名</option>
                                        <option value="snippet">本文</option>
                                        <option value="domain">送信元ドメイン</option>
                                        <option value="hasAttachment">添付ファイル</option>
                                        <option value="isUnread">未読</option>
                                        <option value="isStarred">スター付き</option>
                                    </select>
                                    <select class="new-rule-operator" style="flex:1;padding:8px;border:1px solid #dadce0;border-radius:6px;font-size:13px;">
                                        <option value="contains">含む</option>
                                        <option value="equals">完全一致</option>
                                        <option value="startsWith">で始まる</option>
                                        <option value="endsWith">で終わる</option>
                                        <option value="regex">正規表現</option>
                                    </select>
                                </div>
                                <div style="display:flex;gap:8px;">
                                    <input type="text" class="new-rule-value" placeholder="値を入力..." style="flex:1;padding:8px 12px;border:1px solid #dadce0;border-radius:6px;font-size:13px;outline:none;">
                                    <button class="add-rule-btn" style="padding:8px 16px;background:#4285f4;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">追加</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 検索クエリ -->
                    <details style="margin-bottom:20px;">
                        <summary style="font-size:13px;color:#5f6368;cursor:pointer;">詳細オプション（Gmail検索クエリ）</summary>
                        <div style="margin-top:8px;">
                            <input type="text" class="tab-query" value="${escapeHtml(tab.query || '')}" placeholder="例: from:boss@company.com" style="width:100%;padding:10px 12px;border:1px solid #dadce0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                        </div>
                    </details>
                    
                    <div style="display:flex;justify-content:flex-end;gap:12px;">
                        <button class="cancel-btn" style="padding:10px 20px;background:transparent;border:1px solid #dadce0;border-radius:6px;cursor:pointer;">キャンセル</button>
                        <button class="save-btn" style="padding:10px 20px;background:#4285f4;color:white;border:none;border-radius:6px;cursor:pointer;">保存</button>
                    </div>
                    
                    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e0e0e0;">
                        <button class="delete-tab-btn" style="padding:8px 0;background:transparent;border:none;color:#ea4335;cursor:pointer;font-size:13px;display:flex;align-items:center;">
                            <span style="font-size:16px;margin-right:4px;">🗑️</span> このタブを削除
                        </button>
                    </div>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // ルール管理（既存ルールをコピー）
            const rules = tab.rules ? [...tab.rules] : [];
            const rulesListEl = modal.querySelector('.rules-list');

            const FIELD_LABELS_EDIT = {
                from: '送信者メール', fromName: '送信者名', subject: '件名', snippet: '本文',
                domain: '送信元ドメイン', hasAttachment: '添付ファイル',
                isUnread: '未読', isStarred: 'スター付き',
            };
            const OPERATOR_LABELS_EDIT = {
                equals: '完全一致', contains: '含む', startsWith: 'で始まる',
                endsWith: 'で終わる', regex: '正規表現', isTrue: 'である', isFalse: 'ではない',
            };
            const FIELD_OPERATORS_EDIT = {
                from: ['contains', 'equals', 'startsWith', 'endsWith', 'regex'],
                fromName: ['contains', 'equals', 'startsWith', 'endsWith', 'regex'],
                subject: ['contains', 'equals', 'startsWith', 'endsWith', 'regex'],
                snippet: ['contains'],
                domain: ['contains', 'equals', 'endsWith'],
                hasAttachment: ['isTrue', 'isFalse'],
                isUnread: ['isTrue', 'isFalse'],
                isStarred: ['isTrue', 'isFalse'],
            };

            function renderRulesEdit() {
                if (rules.length === 0) {
                    rulesListEl.innerHTML = '<div style="padding:12px;text-align:center;color:#5f6368;font-size:13px;">ルールがありません</div>';
                } else {
                    rulesListEl.innerHTML = rules.map((rule, i) => `
                        <div style="display:flex;align-items:center;padding:8px 12px;border-bottom:1px solid #f0f0f0;gap:8px;">
                            <span style="flex:1;font-size:13px;">
                                <strong>${FIELD_LABELS_EDIT[rule.field] || rule.field}</strong>
                                <span style="color:#5f6368;">${OPERATOR_LABELS_EDIT[rule.operator] || rule.operator}</span>
                                ${typeof rule.value === 'boolean' ? '' : '「' + escapeHtml(String(rule.value)) + '」'}
                            </span>
                            <button class="remove-rule" data-index="${i}" style="width:24px;height:24px;border:none;background:transparent;color:#ea4335;cursor:pointer;font-size:16px;">×</button>
                        </div>
                    `).join('');

                    rulesListEl.querySelectorAll('.remove-rule').forEach(btn => {
                        btn.addEventListener('click', () => {
                            rules.splice(parseInt(btn.dataset.index), 1);
                            renderRulesEdit();
                        });
                    });
                }
            }
            renderRulesEdit();

            // フィールド/演算子の更新
            const fieldSelect = modal.querySelector('.new-rule-field');
            const operatorSelect = modal.querySelector('.new-rule-operator');
            const valueInput = modal.querySelector('.new-rule-value');

            function updateOperatorsEdit() {
                const field = fieldSelect.value;
                const operators = FIELD_OPERATORS_EDIT[field] || ['contains'];
                operatorSelect.innerHTML = operators.map(op =>
                    `<option value="${op}">${OPERATOR_LABELS_EDIT[op] || op}</option>`
                ).join('');

                if (['hasAttachment', 'isUnread', 'isStarred'].includes(field)) {
                    valueInput.style.display = 'none';
                    valueInput.value = '';
                } else {
                    valueInput.style.display = 'block';
                }
            }
            fieldSelect.addEventListener('change', updateOperatorsEdit);
            updateOperatorsEdit();

            // ルール追加
            modal.querySelector('.add-rule-btn').addEventListener('click', () => {
                const field = fieldSelect.value;
                const operator = operatorSelect.value;
                let value = valueInput.value.trim();

                if (['hasAttachment', 'isUnread', 'isStarred'].includes(field)) {
                    value = operator === 'isTrue';
                } else if (!value) {
                    showToast('値を入力してください');
                    return;
                }

                rules.push({ field, operator, value });
                valueInput.value = '';
                renderRulesEdit();
            });

            // カラー選択
            let selectedColor = tab.color || '#4285f4';
            const colorBtns = modal.querySelectorAll('.color-options button');
            colorBtns.forEach(btn => {
                if (btn.dataset.color === selectedColor) {
                    btn.style.borderColor = '#202124';
                }
                btn.addEventListener('click', () => {
                    colorBtns.forEach(b => b.style.borderColor = 'transparent');
                    btn.style.borderColor = '#202124';
                    selectedColor = btn.dataset.color;
                });
            });

            const close = async (save) => {
                if (save) {
                    const name = modal.querySelector('.tab-name').value.trim();
                    const query = modal.querySelector('.tab-query').value.trim();
                    const logic = modal.querySelector('.rule-logic').value;

                    if (!name) {
                        showToast('タブ名を入力してください');
                        return;
                    }

                    // 既存のタブ設定を更新（ルール情報も保持）
                    settings.customTabs[index] = {
                        name,
                        color: selectedColor,
                        query: query || null,
                        rules: rules.length > 0 ? rules : null,
                        logic: rules.length > 0 ? logic : null
                    };
                    await saveSettings({ customTabs: settings.customTabs });
                    injectCustomTabsUI();
                    applyRuleIndicators();
                    showToast(`タブ「${name}」を更新しました`);
                }
                overlay.remove();
                resolve();
            };

            modal.querySelector('.cancel-btn').addEventListener('click', () => close(false));
            modal.querySelector('.save-btn').addEventListener('click', () => close(true));

            // 削除ボタン
            modal.querySelector('.delete-tab-btn').addEventListener('click', async () => {
                if (confirm(`タブ「${tab.name}」を本当に削除しますか？`)) {
                    settings.customTabs.splice(index, 1);
                    await saveSettings({ customTabs: settings.customTabs });
                    injectCustomTabsUI();
                    showToast(`タブ「${tab.name}」を削除しました`);
                    overlay.remove();
                    resolve();
                }
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });
        });
    }

    function executeTabQuery(query, color) {
        // クエリを実行（アクティブ状態はupdateActiveTabで管理）

        if (!query) {
            // 「すべて」タブ: 受信トレイに戻る
            const currentUrl = window.location.href;
            const inboxUrl = currentUrl.replace(/#.*$/, '#inbox');
            window.location.href = inboxUrl;
            showToast('すべてのメールを表示');
            return;
        }

        // URL経由で直接検索（最も確実な方法）
        const currentUrl = window.location.href;
        const searchUrl = currentUrl.replace(/#.*$/, '#search/' + encodeURIComponent(query));
        window.location.href = searchUrl;

        showToast(`「${query}」で検索中...`);
    }

    function updateActiveTab(tabIndex) {
        activeTabIndex = tabIndex;

        if (!customTabsContainer) return;

        const buttons = customTabsContainer.querySelectorAll('.enhance-gmail-tab-btn');
        buttons.forEach(btn => {
            const btnIndex = parseInt(btn.dataset.index);
            const isActive = btnIndex === tabIndex;
            const tab = btnIndex >= 0 ? settings.customTabs[btnIndex] : { color: '#5f6368' };

            btn.style.background = isActive ? (tab.color || '#5f6368') + '20' : 'transparent';
            btn.style.color = isActive ? (tab.color || '#5f6368') : '#5f6368';
            btn.style.fontWeight = isActive ? '500' : '400';
        });
    }

    async function showAddTabDialog() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999998;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
                width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                font-family: 'Google Sans', Roboto, sans-serif;
            `;
            modal.innerHTML = `
                <div style="padding: 24px;">
                    <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;">新しいタブを追加</h2>
                    
                    <!-- タブ名 -->
                    <div style="margin-bottom:16px;">
                        <label style="display:block;margin-bottom:4px;font-size:13px;color:#5f6368;">タブ名</label>
                        <input type="text" class="tab-name" placeholder="例: VIP, 請求書" style="
                            width: 100%;
                            padding: 10px 12px;
                            border: 1px solid #dadce0;
                            border-radius: 8px;
                            font-size: 14px;
                            outline: none;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <!-- カラー選択 -->
                    <div style="margin-bottom:20px;">
                        <label style="display:block;margin-bottom:4px;font-size:13px;color:#5f6368;">カラー</label>
                        <div class="color-options" style="display:flex;gap:8px;">
                            <button data-color="#ea4335" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#ea4335;cursor:pointer;"></button>
                            <button data-color="#4285f4" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#4285f4;cursor:pointer;"></button>
                            <button data-color="#34a853" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#34a853;cursor:pointer;"></button>
                            <button data-color="#fbbc04" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#fbbc04;cursor:pointer;"></button>
                            <button data-color="#9c27b0" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#9c27b0;cursor:pointer;"></button>
                            <button data-color="#00bcd4" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;background:#00bcd4;cursor:pointer;"></button>
                        </div>
                    </div>
                    
                    <!-- 振り分けルール -->
                    <div style="margin-bottom:20px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                            <label style="font-size:13px;font-weight:500;color:#202124;">振り分けルール</label>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:12px;color:#5f6368;">条件:</span>
                                <select class="rule-logic" style="padding:4px 8px;border:1px solid #dadce0;border-radius:4px;font-size:12px;">
                                    <option value="or">いずれかに一致 (OR)</option>
                                    <option value="and">すべてに一致 (AND)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="rules-container" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
                            <!-- ルールリスト -->
                            <div class="rules-list" style="max-height:200px;overflow-y:auto;"></div>
                            
                            <!-- ルール追加UI -->
                            <div style="padding:12px;background:#f8f9fa;border-top:1px solid #e0e0e0;">
                                <div style="display:flex;gap:8px;margin-bottom:8px;">
                                    <select class="new-rule-field" style="flex:1;padding:8px;border:1px solid #dadce0;border-radius:6px;font-size:13px;">
                                        <option value="from">送信者メール</option>
                                        <option value="fromName">送信者名</option>
                                        <option value="subject">件名</option>
                                        <option value="snippet">本文</option>
                                        <option value="domain">送信元ドメイン</option>
                                        <option value="hasAttachment">添付ファイル</option>
                                        <option value="isUnread">未読</option>
                                        <option value="isStarred">スター付き</option>
                                    </select>
                                    <select class="new-rule-operator" style="flex:1;padding:8px;border:1px solid #dadce0;border-radius:6px;font-size:13px;">
                                        <option value="contains">含む</option>
                                        <option value="equals">完全一致</option>
                                        <option value="startsWith">で始まる</option>
                                        <option value="endsWith">で終わる</option>
                                        <option value="regex">正規表現</option>
                                    </select>
                                </div>
                                <div style="display:flex;gap:8px;">
                                    <input type="text" class="new-rule-value" placeholder="値を入力..." style="
                                        flex: 1;
                                        padding: 8px 12px;
                                        border: 1px solid #dadce0;
                                        border-radius: 6px;
                                        font-size: 13px;
                                        outline: none;
                                    ">
                                    <button class="add-rule-btn" style="padding:8px 16px;background:#4285f4;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">追加</button>
                                </div>
                            </div>
                        </div>
                        <p style="margin:8px 0 0;font-size:11px;color:#5f6368;">
                            例: 送信者メール「contains」「boss」→ bossを含むアドレスからのメール
                        </p>
                    </div>
                    
                    <!-- 検索クエリ（従来方式・オプション） -->
                    <details style="margin-bottom:20px;">
                        <summary style="font-size:13px;color:#5f6368;cursor:pointer;margin-bottom:8px;">
                            詳細オプション（Gmail検索クエリ）
                        </summary>
                        <div style="margin-top:8px;">
                            <input type="text" class="tab-query" placeholder="例: from:boss@company.com OR label:VIP" style="
                                width: 100%;
                                padding: 10px 12px;
                                border: 1px solid #dadce0;
                                border-radius: 8px;
                                font-size: 14px;
                                outline: none;
                                box-sizing: border-box;
                            ">
                            <p style="margin:8px 0 0;font-size:11px;color:#5f6368;">
                                タブクリック時にこのクエリで検索します。ルールと併用可。
                            </p>
                        </div>
                    </details>
                    
                    <div style="display:flex;justify-content:flex-end;gap:12px;">
                        <button class="cancel-btn" style="padding:10px 20px;background:transparent;border:1px solid #dadce0;border-radius:6px;cursor:pointer;">キャンセル</button>
                        <button class="add-btn" style="padding:10px 20px;background:#4285f4;color:white;border:none;border-radius:6px;cursor:pointer;">追加</button>
                    </div>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // ルール管理
            const rules = [];
            const rulesListEl = modal.querySelector('.rules-list');

            function renderRules() {
                if (rules.length === 0) {
                    rulesListEl.innerHTML = '<div style="padding:16px;text-align:center;color:#5f6368;font-size:13px;">ルールがありません。下のフォームから追加してください。</div>';
                } else {
                    rulesListEl.innerHTML = rules.map((rule, i) => `
                        <div style="display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid #f0f0f0;gap:8px;" data-index="${i}">
                            <span style="flex:1;font-size:13px;">
                                <strong>${FIELD_LABELS[rule.field] || rule.field}</strong>
                                <span style="color:#5f6368;">${OPERATOR_LABELS[rule.operator] || rule.operator}</span>
                                「${escapeHtml(String(rule.value))}」
                            </span>
                            <button class="remove-rule" data-index="${i}" style="width:24px;height:24px;border:none;background:transparent;color:#ea4335;cursor:pointer;font-size:16px;">×</button>
                        </div>
                    `).join('');

                    // 削除ボタンのイベント
                    rulesListEl.querySelectorAll('.remove-rule').forEach(btn => {
                        btn.addEventListener('click', () => {
                            rules.splice(parseInt(btn.dataset.index), 1);
                            renderRules();
                        });
                    });
                }
            }
            renderRules();

            // フィールド変更時に演算子を更新
            const fieldSelect = modal.querySelector('.new-rule-field');
            const operatorSelect = modal.querySelector('.new-rule-operator');
            const valueInput = modal.querySelector('.new-rule-value');

            const FIELD_OPERATORS = {
                from: ['contains', 'equals', 'startsWith', 'endsWith', 'regex'],
                fromName: ['contains', 'equals', 'startsWith', 'endsWith', 'regex'],
                subject: ['contains', 'equals', 'startsWith', 'endsWith', 'regex'],
                snippet: ['contains'],
                domain: ['contains', 'equals', 'endsWith'],
                hasAttachment: ['isTrue', 'isFalse'],
                isUnread: ['isTrue', 'isFalse'],
                isStarred: ['isTrue', 'isFalse'],
            };

            const OPERATOR_LABELS = {
                equals: '完全一致',
                contains: '含む',
                startsWith: 'で始まる',
                endsWith: 'で終わる',
                regex: '正規表現',
                isTrue: 'である',
                isFalse: 'ではない',
            };

            const FIELD_LABELS = {
                from: '送信者メール',
                fromName: '送信者名',
                subject: '件名',
                snippet: '本文',
                domain: '送信元ドメイン',
                hasAttachment: '添付ファイル',
                isUnread: '未読',
                isStarred: 'スター付き',
            };

            function updateOperators() {
                const field = fieldSelect.value;
                const operators = FIELD_OPERATORS[field] || ['contains'];
                operatorSelect.innerHTML = operators.map(op =>
                    `<option value="${op}">${OPERATOR_LABELS[op] || op}</option>`
                ).join('');

                // boolean型フィールドは値入力を非表示
                if (['hasAttachment', 'isUnread', 'isStarred'].includes(field)) {
                    valueInput.style.display = 'none';
                    valueInput.value = '';
                } else {
                    valueInput.style.display = 'block';
                }
            }
            fieldSelect.addEventListener('change', updateOperators);
            updateOperators();

            // ルール追加
            modal.querySelector('.add-rule-btn').addEventListener('click', () => {
                const field = fieldSelect.value;
                const operator = operatorSelect.value;
                let value = valueInput.value.trim();

                // boolean型フィールド
                if (['hasAttachment', 'isUnread', 'isStarred'].includes(field)) {
                    value = operator === 'isTrue';
                } else if (!value) {
                    showToast('値を入力してください');
                    return;
                }

                rules.push({ field, operator, value });
                valueInput.value = '';
                renderRules();
            });

            // カラー選択
            let selectedColor = '#4285f4';
            const colorBtns = modal.querySelectorAll('.color-options button');
            colorBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    colorBtns.forEach(b => b.style.borderColor = 'transparent');
                    btn.style.borderColor = '#202124';
                    selectedColor = btn.dataset.color;
                });
            });
            colorBtns[1].style.borderColor = '#202124';

            const nameInput = modal.querySelector('.tab-name');
            const queryInput = modal.querySelector('.tab-query');
            const logicSelect = modal.querySelector('.rule-logic');

            const close = async (save) => {
                if (save) {
                    const name = nameInput.value.trim();
                    const query = queryInput.value.trim();
                    const logic = logicSelect.value;

                    if (!name) {
                        showToast('タブ名を入力してください');
                        return;
                    }

                    if (rules.length === 0 && !query) {
                        showToast('ルールまたは検索クエリを設定してください');
                        return;
                    }

                    const newTab = {
                        name,
                        color: selectedColor,
                        query: query || null,
                        rules: rules.length > 0 ? rules : null,
                        logic: rules.length > 0 ? logic : null
                    };

                    settings.customTabs.push(newTab);
                    await saveSettings({ customTabs: settings.customTabs });
                    injectCustomTabsUI();
                    applyRuleIndicators(); // ルールインジケータを適用
                    showToast(`タブ「${name}」を追加しました`);
                }
                overlay.remove();
                resolve();
            };

            modal.querySelector('.cancel-btn').addEventListener('click', () => close(false));
            modal.querySelector('.add-btn').addEventListener('click', () => close(true));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });

            nameInput.focus();
        });
    }

    // ==========================================
    // Rule Engine (Inline Implementation)
    // ==========================================
    const OPERATORS = {
        equals: (value, target) => String(value).toLowerCase() === String(target).toLowerCase(),
        contains: (value, target) => String(value).toLowerCase().includes(String(target).toLowerCase()),
        startsWith: (value, target) => String(value).toLowerCase().startsWith(String(target).toLowerCase()),
        endsWith: (value, target) => String(value).toLowerCase().endsWith(String(target).toLowerCase()),
        regex: (value, target) => {
            try {
                return new RegExp(target, 'i').test(String(value));
            } catch {
                return false;
            }
        },
        isTrue: (value) => value === true,
        isFalse: (value) => value === false || value === null || value === undefined,
    };

    function evaluateRule(emailData, rule) {
        const { field, operator, value } = rule;
        let emailValue = emailData[field];

        // domain フィールドは from から抽出
        if (field === 'domain' && emailData.from) {
            const match = emailData.from.match(/@(.+)$/);
            emailValue = match ? match[1] : '';
        }

        if (emailValue === undefined || emailValue === null) {
            return false;
        }

        const operatorFn = OPERATORS[operator];
        return operatorFn ? operatorFn(emailValue, value) : false;
    }

    function matchesRules(emailData, tabConfig) {
        const { rules, logic = 'or' } = tabConfig;
        if (!rules || rules.length === 0) return false;

        const results = rules.map(rule => evaluateRule(emailData, rule));
        return logic === 'and' ? results.every(r => r) : results.some(r => r);
    }

    // ==========================================
    // Email Data Extractor (Inline Implementation)
    // ==========================================
    function extractEmailData(emailRow) {
        const senderEl = emailRow.querySelector('[email]');
        const from = senderEl?.getAttribute('email') || '';
        const fromName = senderEl?.getAttribute('name') || senderEl?.textContent?.trim() || '';

        const subjectEl = emailRow.querySelector('.y6 span, .bog, .bqe');
        const subject = subjectEl?.textContent?.trim() || '';

        return {
            from,
            fromName,
            subject,
            hasAttachment: emailRow.querySelector('.aZo, [aria-label*="添付"], [aria-label*="Attachment"]') !== null,
            isUnread: emailRow.classList.contains('zE') || emailRow.querySelector('.zF') !== null,
            isStarred: emailRow.querySelector('.T-KT-Jp') !== null,
        };
    }

    // ==========================================
    // Rule Indicators on Email List
    // ==========================================
    function applyRuleIndicators() {
        const tabs = settings.customTabs || [];
        const tabsWithRules = tabs.filter(t => t.rules && t.rules.length > 0);
        if (tabsWithRules.length === 0) return;

        const emailRows = document.querySelectorAll('tr.zA');
        emailRows.forEach(row => {
            // 既存のインジケータを削除
            row.querySelectorAll('.enhance-gmail-rule-dot').forEach(el => el.remove());

            const emailData = extractEmailData(row);

            for (const tab of tabsWithRules) {
                if (matchesRules(emailData, tab)) {
                    // カラードットを追加
                    const dot = document.createElement('span');
                    dot.className = 'enhance-gmail-rule-dot';
                    dot.title = `タブ: ${tab.name}`;
                    dot.style.cssText = `
                        display: inline-block;
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: ${tab.color};
                        margin-right: 6px;
                        flex-shrink: 0;
                    `;

                    // 送信者セルの先頭に追加
                    const senderCell = row.querySelector('.yX.xY, .yW');
                    if (senderCell) {
                        senderCell.insertBefore(dot, senderCell.firstChild);
                    }
                    break; // 最初にマッチしたタブのみ
                }
            }
        });
    }

    // メール一覧の変更を監視してインジケータを再適用
    function setupRuleIndicatorObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && (node.matches?.('tr.zA') || node.querySelector?.('tr.zA'))) {
                            shouldUpdate = true;
                            break;
                        }
                    }
                }
                if (shouldUpdate) break;
            }
            if (shouldUpdate) {
                setTimeout(applyRuleIndicators, 100);
            }
        });

        const container = document.querySelector('.AO') || document.body;
        observer.observe(container, { childList: true, subtree: true });
    }




    // Gmailのリストロード待機ヘルパー
    async function waitForListLoad() {
        await new Promise(r => setTimeout(r, 500));
        for (let i = 0; i < 20; i++) {
            const rows = document.querySelectorAll('tr.zA');
            if (rows.length > 0) {
                await new Promise(r => setTimeout(r, 500));
                return true;
            }
            await new Promise(r => setTimeout(r, 200));
        }
        return false;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==========================================
    // Main Logic
    // ==========================================
    let initialized = false;
    let settings = null;

    async function init() {
        if (initialized) return;

        console.log('Enhance Gmail: Initializing...');

        settings = await getSettings();
        console.log('Enhance Gmail: Settings loaded', settings);

        setupShortcutListeners();
        setupCustomTabs();

        // ルールインジケータをセットアップ
        setTimeout(() => {
            applyRuleIndicators();
            setupRuleIndicatorObserver();
        }, 2000); // Gmailのメール一覧が読み込まれるのを待つ

        initialized = true;
        console.log('Enhance Gmail: Initialized successfully');
    }

    function setupShortcutListeners() {
        document.addEventListener('keydown', async (e) => {
            // 入力フィールドでは動作しない
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
                return;
            }

            // Shift+1~9: アカウント切り替え（e.codeで検出）
            if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const digitMatch = e.code.match(/^Digit([1-9])$/);
                if (digitMatch) {
                    e.preventDefault();
                    e.stopPropagation();

                    const targetIndex = parseInt(digitMatch[1]) - 1;
                    const currentIndex = getCurrentAccountIndex();
                    if (targetIndex === currentIndex) {
                        showToast(`既にアカウント ${targetIndex + 1} を使用中です`);
                    } else {
                        showToast(`アカウント ${targetIndex + 1} に切り替え中...`);
                        switchAccount(targetIndex);
                    }
                    return;
                }


            }
        });
        console.log('Enhance Gmail: Shortcut listeners registered (Shift+key)');
    }

    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
    } else {
        setTimeout(init, 1000);
    }



})();
