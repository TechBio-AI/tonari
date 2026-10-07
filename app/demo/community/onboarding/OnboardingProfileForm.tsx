'use client'

// 初回の入力フォーム。共通部品 ProfileForm に、同意のチェック（requireConsent）と
// 保存後の移動（/demo/community）を付けるだけの包み。
//
// 保存後は画面ごと読み直す。サーバー側でプロフィールの有無（session.ts の hasProfile）と
// 会員バーの表示名を確かめ直させるため。

import { ProfileForm, type ProfileChoices } from '../_components/ProfileForm'

import { saveOnboardingProfile } from './actions'

export default function OnboardingProfileForm({ choices }: { choices: ProfileChoices }) {
  return (
    <ProfileForm
      choices={choices}
      save={saveOnboardingProfile}
      requireConsent
      submitLabel="同意して保存する"
      onSaved={() => window.location.assign('/demo/community')}
    />
  )
}
