/**
 * Orphanet → RareDx Disease 型変換モジュール
 * 
 * fetch-orphadata.ts で取得したOrphanetデータを、
 * 既存の Disease 型に変換してアプリケーション内で使用可能にする。
 * 
 * また、Supabase diseases テーブルへのインサート用データも生成する。
 * 
 * @role Builder A
 */

import * as fs from 'fs'
import * as path from 'path'
import type { OrphanetDiseaseRecord } from './fetch-orphadata'

// database.types.ts の Disease 型に相当
interface DiseaseInsert {
    id: string
    orpha_code: string | null
    name_ja: string
    name_en: string
    description_ja: string | null
    description_en: string | null
    prevalence: 'very-rare' | 'rare' | 'occasional' | null
    inheritance: string[]
    age_of_onset: string[]
    diagnostic_methods: string[]
    specialty: string | null
    is_active: boolean
}

// ─────────────────────────────────────────────
// 専門科推定ロジック
// ─────────────────────────────────────────────

/** 
 * 疾患名と遺伝子情報から専門科を推定
 * Orphanetのデータには直接の専門科情報がないため、
 * 疾患名・遺伝子・タイプからヒューリスティックに推定する
 */
function inferSpecialty(record: OrphanetDiseaseRecord): string | null {
    const name = (record.name_en + ' ' + record.name_ja).toLowerCase()

    // キーワードベースの専門科マッピング
    const specialtyKeywords: [string[], string][] = [
        // 神経系
        [['neuro', 'brain', 'spinal', 'epilep', 'ataxia', 'myopath', 'dystrophy', 'neuropath',
            'dementia', 'leukodystrophy', 'encephalopathy', 'paralysis', 'parkinson', 'huntington',
            '筋', '脳', '神経', '脊髄', 'てんかん'], 'neurology'],
        // 血液系
        [['anemia', 'hemophilia', 'thrombocyt', 'leukemia', 'lymphoma', 'myeloma', 'hemoglobin',
            'thalassemia', 'sickle cell', '貧血', '血友病', '白血病'], 'hematology'],
        // 代謝系
        [['metabolic', 'lysosomal', 'glycogen', 'mucopolysaccharid', 'sphingolipid', 'amino acid',
            'organic acid', 'fatty acid oxidation', 'peroxisomal', 'urea cycle',
            'fabry', 'gaucher', 'pompe', 'niemann', 'krabbe', 'tay-sachs', 'phenylketonuria',
            'galactosemia', 'homocystinuria', 'tyrosinemia', 'wilson disease',
            'ライソゾーム', '代謝', '蓄積症'], 'metabolism'],
        // 遺伝子/染色体
        [['chromosome', 'trisomy', 'deletion syndrome', 'microdeletion', 'duplication',
            '染色体', 'トリソミー'], 'genetics'],
        // 腎臓
        [['renal', 'kidney', 'nephro', 'glomerulo', '腎', 'ネフロ'], 'nephrology'],
        // 心臓
        [['cardiac', 'heart', 'cardiomyopath', 'arrhythmia', 'vascular', 'aortic',
            '心', '心臓', '血管'], 'cardiology'],
        // 免疫
        [['immunodeficiency', 'autoimmune', 'immune', 'complement', 'lupus',
            'myasthenia', 'scleroderma', 'vasculitis',
            '免疫', '自己免疫'], 'immunology'],
        // 内分泌
        [['endocrine', 'thyroid', 'adrenal', 'pituitary', 'diabetes', 'growth hormone',
            '甲状腺', '副腎', '内分泌'], 'endocrinology'],
        // 呼吸器
        [['pulmonary', 'respiratory', 'lung', 'bronch', 'cystic fibrosis',
            '肺', '呼吸'], 'pulmonology'],
        // 消化器
        [['hepat', 'liver', 'intestin', 'bowel', 'colitis', 'crohn', 'biliary',
            '肝', '腸', '消化'], 'gastroenterology'],
        // 眼科
        [['retinal', 'optic', 'corneal', 'macular', 'retinitis',
            '網膜', '視神経', '角膜'], 'ophthalmology'],
        // 皮膚科
        [['dermat', 'skin', 'epidermolysis', 'ichthyos', 'cutaneous',
            '皮膚', '表皮'], 'dermatology'],
        // 整形外科
        [['skeletal', 'bone', 'osteo', 'chondro', 'dysplasia',
            '骨', '軟骨'], 'orthopedics'],
        // 腫瘍
        [['tumor', 'cancer', 'neoplasm', 'carcinoma', 'sarcoma',
            '腫瘍', '癌'], 'oncology'],
    ]

    for (const [keywords, specialty] of specialtyKeywords) {
        if (keywords.some(kw => name.includes(kw))) {
            return specialty
        }
    }

    return null
}

// ─────────────────────────────────────────────
// 日本語名補完
// ─────────────────────────────────────────────

/** 
 * 既知の日本語名マッピング（主要100疾患）
 * Orphanetには日本語名がないため、既知の翻訳を提供
 */
const KNOWN_JAPANESE_NAMES: Record<string, string> = {
    'Fabry disease': 'ファブリー病',
    'Gaucher disease': 'ゴーシェ病',
    'Pompe disease': 'ポンペ病',
    'Niemann-Pick disease': 'ニーマン・ピック病',
    'Huntington disease': 'ハンチントン病',
    'Marfan syndrome': 'マルファン症候群',
    'Ehlers-Danlos syndrome': 'エーラス・ダンロス症候群',
    'Cystic fibrosis': '嚢胞性線維症',
    'Sickle cell disease': '鎌状赤血球症',
    'Thalassemia': 'サラセミア',
    'Hemophilia A': '血友病A',
    'Hemophilia B': '血友病B',
    'Phenylketonuria': 'フェニルケトン尿症',
    'Galactosemia': 'ガラクトース血症',
    'Maple syrup urine disease': 'メープルシロップ尿症',
    'Homocystinuria': 'ホモシスチン尿症',
    'Tyrosinemia': 'チロシン血症',
    'Wilson disease': 'ウィルソン病',
    'Duchenne muscular dystrophy': 'デュシェンヌ型筋ジストロフィー',
    'Spinal muscular atrophy': '脊髄性筋萎縮症',
    'Amyotrophic lateral sclerosis': '筋萎縮性側索硬化症',
    'Multiple sclerosis': '多発性硬化症',
    'Myasthenia gravis': '重症筋無力症',
    'Systemic lupus erythematosus': '全身性エリテマトーデス',
    'Pulmonary arterial hypertension': '肺動脈性肺高血圧症',
    'Idiopathic pulmonary fibrosis': '特発性肺線維症',
    'Paroxysmal nocturnal hemoglobinuria': '発作性夜間ヘモグロビン尿症',
    'Atypical hemolytic uremic syndrome': '非定型溶血性尿毒症症候群',
    'Tuberous sclerosis complex': '結節性硬化症',
    'Neurofibromatosis type 1': '神経線維腫症1型',
    'Achondroplasia': '軟骨無形成症',
    'Osteogenesis imperfecta': '骨形成不全症',
    'Rett syndrome': 'レット症候群',
    'Fragile X syndrome': '脆弱X症候群',
    'Turner syndrome': 'ターナー症候群',
    'Klinefelter syndrome': 'クラインフェルター症候群',
    'Down syndrome': 'ダウン症候群',
    'Prader-Willi syndrome': 'プラダー・ウィリ症候群',
    'Angelman syndrome': 'アンジェルマン症候群',
    'Williams syndrome': 'ウィリアムズ症候群',
    'Alagille syndrome': 'アラジール症候群',
    'Noonan syndrome': 'ヌーナン症候群',
    'Cornelia de Lange syndrome': 'コルネリア・デ・ランゲ症候群',
    'Kabuki syndrome': '歌舞伎症候群',
    'Charge syndrome': 'チャージ症候群',
    'Beckwith-Wiedemann syndrome': 'ベックウィズ・ウィードマン症候群',
    'Hereditary angioedema': '遺伝性血管性浮腫',
    'Chronic inflammatory demyelinating polyneuropathy': '慢性炎症性脱髄性多発神経炎',
    'Hereditary hemorrhagic telangiectasia': '遺伝性出血性末梢血管拡張症',
    'Epidermolysis bullosa': '表皮水疱症',
    'Retinitis pigmentosa': '網膜色素変性症',
    'Polycythemia vera': '真性多血症',
    'Essential thrombocythemia': '本態性血小板血症',
    'Primary myelofibrosis': '原発性骨髄線維症',
}

function getJapaneseName(englishName: string): string {
    // 完全一致
    if (KNOWN_JAPANESE_NAMES[englishName]) {
        return KNOWN_JAPANESE_NAMES[englishName]
    }
    // 大文字小文字無視完全一致
    const lower = englishName.toLowerCase()
    for (const [key, value] of Object.entries(KNOWN_JAPANESE_NAMES)) {
        if (key.toLowerCase() === lower) return value
    }
    // 部分一致（英語名が辞書キーを含む、またはその逆）
    for (const [key, value] of Object.entries(KNOWN_JAPANESE_NAMES)) {
        if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
            return value
        }
    }
    return '' // 未知の場合は空文字（後で専門家による翻訳が必要）
}

// ─────────────────────────────────────────────
// メイン変換処理
// ─────────────────────────────────────────────

/**
 * Orphanetレコードを RareDx Disease 型に変換
 */
export function convertToDiseaseInserts(
    records: OrphanetDiseaseRecord[],
    startId: number = 1000  // 既存の100疾患と衝突しないID
): DiseaseInsert[] {
    return records.map((record, index) => {
        const id = String(startId + index)
        const jaName = record.name_ja || getJapaneseName(record.name_en)

        return {
            id,
            orpha_code: record.orphacode,
            name_ja: jaName || record.name_en, // 日本語名がなければ英語名で代替
            name_en: record.name_en,
            description_ja: record.description_ja,
            description_en: record.description_en,
            prevalence: mapPrevalenceForDB(record.prevalence),
            inheritance: record.inheritance,
            age_of_onset: record.age_of_onset,
            diagnostic_methods: [], // Orphanetからは取得不可、後で補完
            specialty: inferSpecialty(record),
            is_active: true,
        }
    })
}

function mapPrevalenceForDB(prevalence: string | null): 'very-rare' | 'rare' | 'occasional' | null {
    if (!prevalence) return null
    if (prevalence === 'ultra-rare' || prevalence === 'very-rare') return 'very-rare'
    if (prevalence === 'rare') return 'rare'
    if (prevalence === 'occasional' || prevalence === 'common') return 'occasional'
    return null
}

/**
 * Supabaseインサート用SQLを生成
 */
export function generateInsertSQL(diseases: DiseaseInsert[]): string {
    const lines: string[] = [
        '-- Orphanet由来疾患データのインサート',
        '-- 自動生成: scripts/etl/convert-orphadata.ts',
        `-- 疾患数: ${diseases.length}`,
        `-- 生成日: ${new Date().toISOString()}`,
        '',
        'BEGIN;',
        '',
    ]

    for (const d of diseases) {
        const escapeSql = (s: string) => s.replace(/'/g, "''")
        lines.push(`INSERT INTO diseases (id, orpha_code, name_ja, name_en, description_ja, description_en, prevalence, inheritance, age_of_onset, diagnostic_methods, specialty, is_active)`)
        lines.push(`VALUES (`)
        lines.push(`  '${d.id}',`)
        lines.push(`  ${d.orpha_code ? `'${escapeSql(d.orpha_code)}'` : 'NULL'},`)
        lines.push(`  '${escapeSql(d.name_ja)}',`)
        lines.push(`  '${escapeSql(d.name_en)}',`)
        lines.push(`  ${d.description_ja ? `'${escapeSql(d.description_ja)}'` : 'NULL'},`)
        lines.push(`  ${d.description_en ? `'${escapeSql(d.description_en)}'` : 'NULL'},`)
        lines.push(`  ${d.prevalence ? `'${d.prevalence}'` : 'NULL'},`)
        lines.push(`  '${JSON.stringify(d.inheritance)}'::jsonb,`)
        lines.push(`  '${JSON.stringify(d.age_of_onset)}'::jsonb,`)
        lines.push(`  '${JSON.stringify(d.diagnostic_methods)}'::jsonb,`)
        lines.push(`  ${d.specialty ? `'${d.specialty}'` : 'NULL'},`)
        lines.push(`  ${d.is_active}`)
        lines.push(`) ON CONFLICT (id) DO UPDATE SET`)
        lines.push(`  orpha_code = EXCLUDED.orpha_code,`)
        lines.push(`  name_ja = EXCLUDED.name_ja,`)
        lines.push(`  name_en = EXCLUDED.name_en,`)
        lines.push(`  description_ja = COALESCE(EXCLUDED.description_ja, diseases.description_ja),`)
        lines.push(`  description_en = COALESCE(EXCLUDED.description_en, diseases.description_en),`)
        lines.push(`  prevalence = EXCLUDED.prevalence,`)
        lines.push(`  inheritance = EXCLUDED.inheritance,`)
        lines.push(`  age_of_onset = EXCLUDED.age_of_onset,`)
        lines.push(`  specialty = EXCLUDED.specialty,`)
        lines.push(`  updated_at = NOW();`)
        lines.push('')
    }

    lines.push('COMMIT;')
    return lines.join('\n')
}

// ─────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────

async function main() {
    const inputPath = path.join(process.cwd(), 'data', 'orphanet', 'orphanet-diseases.json')
    const outputDir = path.join(process.cwd(), 'data', 'orphanet')

    if (!fs.existsSync(inputPath)) {
        console.error(`❌ 入力ファイルが見つかりません: ${inputPath}`)
        console.log('💡 まず fetch-orphadata.ts を実行してください:')
        console.log('   npx tsx scripts/etl/fetch-orphadata.ts')
        process.exit(1)
    }

    const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as OrphanetDiseaseRecord[]
    console.log(`📂 入力: ${raw.length} レコード`)

    const diseases = convertToDiseaseInserts(raw)
    console.log(`🔄 変換完了: ${diseases.length} 疾患`)

    // 統計
    const withJa = diseases.filter(d => d.name_ja !== d.name_en).length
    const withSpecialty = diseases.filter(d => d.specialty).length
    const withPrevalence = diseases.filter(d => d.prevalence).length
    console.log(`  日本語名あり: ${withJa}/${diseases.length}`)
    console.log(`  専門科推定: ${withSpecialty}/${diseases.length}`)
    console.log(`  有病率あり: ${withPrevalence}/${diseases.length}`)

    // JSON出力
    const jsonPath = path.join(outputDir, 'diseases-for-import.json')
    fs.writeFileSync(jsonPath, JSON.stringify(diseases, null, 2), 'utf-8')
    console.log(`📄 JSON出力: ${jsonPath}`)

    // SQL出力
    const sqlPath = path.join(outputDir, 'seed-diseases.sql')
    const sql = generateInsertSQL(diseases)
    fs.writeFileSync(sqlPath, sql, 'utf-8')
    console.log(`📄 SQL出力: ${sqlPath}`)

    console.log('\n🎉 変換パイプライン完了!')
}

main().catch(console.error)
