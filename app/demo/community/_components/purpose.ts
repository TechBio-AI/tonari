// 会員プロフィールの利用目的（2026-09-26 ファウンダー指示の文言そのまま）。
//
// 同意の対象になる文なので、画面ごとに書き換えない。プライバシーのページと同じ文言にする決まり。
// 文の正は lib/portal/consent-texts.ts の base（版番号付き）。ここはいまの版を読み出すだけ。
// 文を変えるときは consent-texts.ts に新しい版を足す（いまの版に同意していない会員には、同意を取り直す）。

import { consentLabelOf, currentConsentText } from '@/lib/portal/consent-texts'

export const USAGE_PURPOSE_TEXT = currentConsentText('base').text

export const CONSENT_LABEL = consentLabelOf(currentConsentText('base'))
export const CONSENT_REQUIRED_MESSAGE = '利用目的への同意が必要です'
