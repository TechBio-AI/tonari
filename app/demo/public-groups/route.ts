// DB にだけある会（会の新設で作られた会）の一覧（GET /demo/public-groups。/demo/groups の画面が読む。2026-10-04）
//
// public_groups（anon が読める公開用の表）のうち、data/patient_groups/patient_groups.json に無い会だけを返す。
// 返すのは slug・名前・対象の病気（名前と疾患ページの slug）だけ。600 秒ごとに作り直す。読めなければ空。

import { NextResponse } from 'next/server'

import { fetchPublicGroups } from '../_lib/contract-db'
import { toNewPublicGroupItems } from '../groups/_lib/new-public-groups'

export const revalidate = 600

export async function GET() {
  const groups = await fetchPublicGroups()
  return NextResponse.json({ groups: toNewPublicGroupItems(groups ?? []) })
}
