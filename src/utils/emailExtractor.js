/**
 * Email Data Extractor for Enhance Gmail
 * Gmailのメール要素から情報を抽出
 */

/**
 * メール行要素からメールデータを抽出
 * @param {HTMLElement} emailRow - Gmail メール行要素 (tr.zA)
 * @returns {Object} - 抽出したメールデータ
 */
export function extractEmailData(emailRow) {
    return {
        // 送信者情報
        from: getFrom(emailRow),
        fromName: getFromName(emailRow),

        // 件名
        subject: getSubject(emailRow),

        // フラグ
        hasAttachment: hasAttachment(emailRow),
        isUnread: isUnread(emailRow),
        isStarred: isStarred(emailRow),
        isImportant: isImportant(emailRow),

        // その他
        snippet: getSnippet(emailRow),
        date: getDate(emailRow),
    };
}

/**
 * 送信者メールアドレスを取得
 */
function getFrom(emailRow) {
    // email属性から取得
    const senderEl = emailRow.querySelector('[email]');
    if (senderEl) {
        return senderEl.getAttribute('email') || '';
    }

    // data-hovercard-id属性から取得
    const hovercard = emailRow.querySelector('[data-hovercard-id]');
    if (hovercard) {
        const id = hovercard.getAttribute('data-hovercard-id') || '';
        if (id.includes('@')) {
            return id;
        }
    }

    return '';
}

/**
 * 送信者名を取得
 */
function getFromName(emailRow) {
    // name属性から取得
    const senderEl = emailRow.querySelector('[email]');
    if (senderEl) {
        return senderEl.getAttribute('name') || senderEl.textContent?.trim() || '';
    }

    // 送信者列から取得
    const senderCell = emailRow.querySelector('.yX.xY, .yW');
    if (senderCell) {
        return senderCell.textContent?.trim() || '';
    }

    return '';
}

/**
 * 件名を取得
 */
function getSubject(emailRow) {
    // 件名要素を探す
    const subjectEl = emailRow.querySelector('.y6 span[data-thread-id], .bog, .bqe');
    if (subjectEl) {
        return subjectEl.textContent?.trim() || '';
    }

    // 別のセレクタを試す
    const subjectCell = emailRow.querySelector('.xT .y6');
    if (subjectCell) {
        // 最初のspanが件名
        const firstSpan = subjectCell.querySelector('span');
        if (firstSpan) {
            return firstSpan.textContent?.trim() || '';
        }
    }

    return '';
}

/**
 * 添付ファイルの有無を確認
 */
function hasAttachment(emailRow) {
    // 添付ファイルアイコンを探す
    return emailRow.querySelector('.yf.xY .brd, [aria-label*="添付"], [aria-label*="Attachment"]') !== null ||
        emailRow.querySelector('.aZo') !== null;
}

/**
 * 未読かどうかを確認
 */
function isUnread(emailRow) {
    // 未読メールは太字クラスを持つ
    return emailRow.classList.contains('zE') ||
        emailRow.querySelector('.zF') !== null ||
        emailRow.querySelector('.bqe') !== null;
}

/**
 * スター付きかどうかを確認
 */
function isStarred(emailRow) {
    const starEl = emailRow.querySelector('.T-KT');
    if (starEl) {
        // aria-label または title でスター状態を確認
        const label = starEl.getAttribute('aria-label') || starEl.getAttribute('title') || '';
        return label.includes('スター付き') ||
            label.includes('Starred') ||
            starEl.classList.contains('T-KT-Jp');
    }
    return false;
}

/**
 * 重要マークかどうかを確認
 */
function isImportant(emailRow) {
    const importantEl = emailRow.querySelector('.WA.pH.wT, [aria-label*="重要"], [aria-label*="Important"]');
    if (importantEl) {
        const label = importantEl.getAttribute('aria-label') || '';
        return label.includes('重要とマーク') || label.includes('marked as important');
    }
    return false;
}

/**
 * スニペット（本文プレビュー）を取得
 */
function getSnippet(emailRow) {
    const snippetEl = emailRow.querySelector('.y2');
    return snippetEl?.textContent?.trim() || '';
}

/**
 * 日付を取得
 */
function getDate(emailRow) {
    const dateEl = emailRow.querySelector('.xW.xY span[title], .yf.xY span');
    if (dateEl) {
        const title = dateEl.getAttribute('title');
        if (title) {
            return new Date(title);
        }
        return dateEl.textContent?.trim() || '';
    }
    return '';
}

/**
 * 開いているメールの詳細情報を取得（メール詳細ビュー用）
 */
export function extractOpenEmailData() {
    const emailContainer = document.querySelector('.adn.ads');
    if (!emailContainer) return null;

    // 送信者情報
    const senderEl = emailContainer.querySelector('.gD[email]');
    const from = senderEl?.getAttribute('email') || '';
    const fromName = senderEl?.getAttribute('name') || senderEl?.textContent?.trim() || '';

    // 件名
    const subjectEl = document.querySelector('.hP');
    const subject = subjectEl?.textContent?.trim() || '';

    // 宛先
    const toEl = emailContainer.querySelector('.g2');
    const to = toEl?.textContent?.replace('To:', '').trim() || '';

    // 本文
    const bodyEl = emailContainer.querySelector('.a3s.aiL');
    const body = bodyEl?.textContent?.trim() || '';

    return {
        from,
        fromName,
        to,
        subject,
        body,
        hasAttachment: emailContainer.querySelector('.aZo, .aQH') !== null,
        isStarred: emailContainer.querySelector('.T-KT-Jp') !== null,
    };
}
