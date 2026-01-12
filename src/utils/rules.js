/**
 * Rule Engine for Enhance Gmail
 * ルールベースのメール振り分け処理
 */

// サポートする演算子
export const OPERATORS = {
    equals: (value, target) => value === target,
    notEquals: (value, target) => value !== target,
    contains: (value, target) => String(value).toLowerCase().includes(String(target).toLowerCase()),
    notContains: (value, target) => !String(value).toLowerCase().includes(String(target).toLowerCase()),
    startsWith: (value, target) => String(value).toLowerCase().startsWith(String(target).toLowerCase()),
    endsWith: (value, target) => String(value).toLowerCase().endsWith(String(target).toLowerCase()),
    regex: (value, target) => {
        try {
            const regex = new RegExp(target, 'i');
            return regex.test(String(value));
        } catch {
            return false;
        }
    },
    greaterThan: (value, target) => Number(value) > Number(target),
    lessThan: (value, target) => Number(value) < Number(target),
    isTrue: (value) => value === true,
    isFalse: (value) => value === false,
};

// 演算子の日本語ラベル
export const OPERATOR_LABELS = {
    equals: '完全一致',
    notEquals: '一致しない',
    contains: '含む',
    notContains: '含まない',
    startsWith: 'で始まる',
    endsWith: 'で終わる',
    regex: '正規表現',
    greaterThan: 'より大きい',
    lessThan: 'より小さい',
    isTrue: 'true',
    isFalse: 'false',
};

// フィールドの日本語ラベル
export const FIELD_LABELS = {
    from: '送信者メール',
    fromName: '送信者名',
    to: '宛先',
    subject: '件名',
    hasAttachment: '添付ファイル',
    isUnread: '未読',
    isStarred: 'スター付き',
    isImportant: '重要',
    domain: '送信元ドメイン',
};

// フィールドごとに使用可能な演算子
export const FIELD_OPERATORS = {
    from: ['equals', 'contains', 'startsWith', 'endsWith', 'regex'],
    fromName: ['equals', 'contains', 'startsWith', 'endsWith', 'regex'],
    to: ['equals', 'contains', 'regex'],
    subject: ['equals', 'contains', 'startsWith', 'endsWith', 'regex'],
    hasAttachment: ['isTrue', 'isFalse'],
    isUnread: ['isTrue', 'isFalse'],
    isStarred: ['isTrue', 'isFalse'],
    isImportant: ['isTrue', 'isFalse'],
    domain: ['equals', 'contains', 'endsWith'],
};

/**
 * 単一ルールを評価
 * @param {Object} emailData - メールデータ
 * @param {Object} rule - ルール設定
 * @returns {boolean}
 */
export function evaluateRule(emailData, rule) {
    const { field, operator, value } = rule;

    // メールデータから該当フィールドの値を取得
    let emailValue = emailData[field];

    // domain フィールドは from から抽出
    if (field === 'domain' && emailData.from) {
        const match = emailData.from.match(/@(.+)$/);
        emailValue = match ? match[1] : '';
    }

    // 値が存在しない場合
    if (emailValue === undefined || emailValue === null) {
        return false;
    }

    // 演算子を取得して実行
    const operatorFn = OPERATORS[operator];
    if (!operatorFn) {
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }

    return operatorFn(emailValue, value);
}

/**
 * タブのルール設定とマッチング
 * @param {Object} emailData - メールデータ
 * @param {Object} tabConfig - タブ設定（rules, logic を含む）
 * @returns {boolean}
 */
export function matchesRules(emailData, tabConfig) {
    const { rules, logic = 'or' } = tabConfig;

    // ルールが設定されていない場合
    if (!rules || rules.length === 0) {
        return false;
    }

    // 各ルールを評価
    const results = rules.map(rule => evaluateRule(emailData, rule));

    // OR条件: いずれか1つでもtrueならtrue
    if (logic === 'or') {
        return results.some(r => r === true);
    }

    // AND条件: すべてtrueならtrue
    if (logic === 'and') {
        return results.every(r => r === true);
    }

    return false;
}

/**
 * メールがどのタブにマッチするか判定
 * @param {Object} emailData - メールデータ
 * @param {Array} tabs - タブ設定の配列
 * @returns {Object|null} - マッチしたタブ、またはnull
 */
export function findMatchingTab(emailData, tabs) {
    for (const tab of tabs) {
        if (tab.rules && tab.rules.length > 0 && matchesRules(emailData, tab)) {
            return tab;
        }
    }
    return null;
}
