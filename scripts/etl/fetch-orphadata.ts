/**
 * Orphanet データ統合パイプライン（Phase A-1）
 * 
 * Orphadata Science（CC BY 4.0）からJSON形式で疾患データを取得し、
 * RareDxの内部フォーマットに変換する。
 * 
 * データソース:
 * - Orphanet Nomenclature Pack (疾患名・ORPHAcode・分類)
 * - Orphanet Clinical Signs (HPO-疾患マッピング)
 * - Orphanet Genes (遺伝子-疾患関連)
 * - Orphanet Epidemiology (有病率・遺伝形式・発症年齢)
 * 
 * 使用方法:
 *   npx tsx scripts/etl/fetch-orphadata.ts
 * 
 * @license CC BY 4.0 (Orphadata Science)
 * @role Builder A
 */

import * as fs from 'fs'
import * as path from 'path'

// ─────────────────────────────────────────────
// 型定義: Orphanet JSONフォーマット
// ─────────────────────────────────────────────

/** Orphanet 疾患エントリ（Nomenclature Pack） */
interface OrphaDisorder {
    ORPHAcode: number
    ExpertLink: string
    Name: { lang: string; value: string }[]
    DisorderType: { Name: { lang: string; value: string }[] }
    DisorderGroup: { Name: { lang: string; value: string }[] }
    TextAuto?: { Info: { lang: string; value: string }[] }
}

/** Orphanet HPO関連（Clinical Signs） */
interface OrphaHPOAssociation {
    ORPHAcode: number
    HPO: {
        HPOId: string
        HPOTerm: string
    }
    HPOFrequency?: {
        Name: { lang: string; value: string }[]
    }
}

/** Orphanet 遺伝子関連 */
interface OrphaGeneAssociation {
    ORPHAcode: number
    Gene: {
        Symbol: string
        Name: { lang: string; value: string }[]
        GeneType: { Name: { lang: string; value: string }[] }
    }
    DisorderGeneAssociationType: {
        Name: { lang: string; value: string }[]
    }
}

/** Orphanet 疫学データ */
interface OrphaEpidemiology {
    ORPHAcode: number
    AverageAgeOfOnset?: { Name: { lang: string; value: string }[] }[]
    TypeOfInheritance?: { Name: { lang: string; value: string }[] }[]
    Prevalence?: {
        PrevalenceClass: { Name: { lang: string; value: string }[] }
        PrevalenceGeographic: { Name: { lang: string; value: string }[] }
        ValMoy?: string
    }[]
}

// ─────────────────────────────────────────────
// 型定義: RareDx 出力フォーマット
// ─────────────────────────────────────────────

/** RareDx 拡張疾患データ（Orphanet由来） */
export interface OrphanetDiseaseRecord {
    orphacode: string
    name_en: string
    name_ja: string
    description_en: string | null
    description_ja: string | null
    disorder_type: string
    disorder_group: string
    expert_link: string
    // 疫学
    prevalence: string | null
    prevalence_class: string | null
    inheritance: string[]
    age_of_onset: string[]
    // 遺伝子
    associated_genes: {
        symbol: string
        name: string
        association_type: string
    }[]
    // HPO症状
    hpo_associations: {
        hpo_id: string
        hpo_term: string
        frequency: string | null
    }[]
    // メタデータ
    source: 'orphanet'
    source_version: string
    imported_at: string
}

// ─────────────────────────────────────────────
// Orphadata ダウンロードURL（JSON形式）
// ─────────────────────────────────────────────

const ORPHADATA_BASE = 'https://data.orphadata.com/json'

const ORPHADATA_URLS = {
    // 疾患命名（ORPHAcode + 英語名 + 分類）
    nomenclature: `${ORPHADATA_BASE}/ORPHAnomenclature.json`,
    // 臨床徴候（HPO-疾患マッピング）
    clinicalSigns: `${ORPHADATA_BASE}/ORPHAclassification_Phenotypic_series.json`,
    // 遺伝子-疾患関連
    genes: `${ORPHADATA_BASE}/ORPHAgenes.json`,
    // 疫学データ（有病率・発症年齢・遺伝形式）
    epidemiology: `${ORPHADATA_BASE}/ORPHAepidemiology.json`,
} as const

// ─────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────

function getLocalizedValue(names: { lang: string; value: string }[] | undefined, lang: string = 'en', strict: boolean = false): string {
    if (!names || names.length === 0) return ''
    const match = names.find(n => n.lang === lang)
    if (match) return match.value
    if (strict) return '' // strictモード: 指定言語がなければ空文字（フォールバックしない）
    return names[0]?.value || ''
}

function mapPrevalence(prevalenceClass: string): string | null {
    const mapping: Record<string, string> = {
        '>1 / 1,000': 'common',
        '1-5 / 10,000': 'occasional',
        '6-9 / 10,000': 'occasional',
        '1-9 / 100,000': 'rare',
        '1-9 / 1,000,000': 'very-rare',
        '<1 / 1,000,000': 'ultra-rare',
        'Not yet documented': null as unknown as string,
        'Unknown': null as unknown as string,
    }
    return mapping[prevalenceClass] || null
}

function mapInheritance(inheritanceName: string): string {
    const mapping: Record<string, string> = {
        'Autosomal dominant': 'autosomal_dominant',
        'Autosomal recessive': 'autosomal_recessive',
        'X-linked dominant': 'x_linked_dominant',
        'X-linked recessive': 'x_linked_recessive',
        'Mitochondrial inheritance': 'mitochondrial',
        'Multigenic/multifactorial': 'multigenic',
        'Not applicable': 'not_applicable',
        'Unknown': 'unknown',
    }
    return mapping[inheritanceName] || inheritanceName.toLowerCase().replace(/\s+/g, '_')
}

function mapAgeOfOnset(onsetName: string): string {
    const mapping: Record<string, string> = {
        'Antenatal': 'antenatal',
        'Neonatal': 'neonatal',
        'Infancy': 'infancy',
        'Childhood': 'childhood',
        'Adolescence': 'adolescence',
        'Adult': 'adulthood',
        'Elderly': 'elderly',
        'All ages': 'all_ages',
        'No data available': 'unknown',
    }
    return mapping[onsetName] || onsetName.toLowerCase().replace(/\s+/g, '_')
}

// ─────────────────────────────────────────────
// メイン処理
// ─────────────────────────────────────────────

async function fetchJSON<T>(url: string, label: string): Promise<T | null> {
    console.log(`📥 ${label} を取得中... (${url})`)
    try {
        const response = await fetch(url)
        if (!response.ok) {
            console.warn(`⚠️ ${label} の取得に失敗: ${response.status} ${response.statusText}`)
            return null
        }
        const data = await response.json()
        console.log(`✅ ${label} 取得完了`)
        return data as T
    } catch (error) {
        console.warn(`⚠️ ${label} の取得中にエラー:`, error)
        return null
    }
}

/**
 * ローカルJSONファイルからデータを読み込む
 * Orphadata のJSONを手動ダウンロード済みの場合に使用
 */
function loadLocalJSON<T>(filePath: string, label: string): T | null {
    console.log(`📂 ${label} をローカルから読み込み中... (${filePath})`)
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ ${label} が見つかりません: ${filePath}`)
            return null
        }
        const raw = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(raw)
        console.log(`✅ ${label} 読み込み完了`)
        return data as T
    } catch (error) {
        console.warn(`⚠️ ${label} の読み込み中にエラー:`, error)
        return null
    }
}

/**
 * Orphadataの全データを取得してRareDxフォーマットに変換
 */
export async function buildOrphanetDatabase(
    options: {
        localDataDir?: string    // ローカルJSONディレクトリ（オフライン使用時）
        outputDir?: string       // 出力ディレクトリ
        maxDiseases?: number     // 取込上限（デバッグ用）
        disorderTypes?: string[] // フィルター: 疾患タイプ
    } = {}
): Promise<OrphanetDiseaseRecord[]> {
    const {
        localDataDir,
        outputDir = path.join(process.cwd(), 'data', 'orphanet'),
        maxDiseases,
        disorderTypes = ['Disease', 'Clinical subtype', 'Etiological subtype'],
    } = options

    console.log('\n═══════════════════════════════════════════════')
    console.log('  RareDx × Orphanet データ統合パイプライン')
    console.log('═══════════════════════════════════════════════\n')

    // Step 1: データ取得（ローカル or リモート）
    let nomenclatureData: any
    let genesData: any
    let epidemiologyData: any

    if (localDataDir) {
        nomenclatureData = loadLocalJSON(path.join(localDataDir, 'ORPHAnomenclature.json'), 'Nomenclature')
        genesData = loadLocalJSON(path.join(localDataDir, 'ORPHAgenes.json'), 'Genes')
        epidemiologyData = loadLocalJSON(path.join(localDataDir, 'ORPHAepidemiology.json'), 'Epidemiology')
    } else {
        nomenclatureData = await fetchJSON(ORPHADATA_URLS.nomenclature, 'Nomenclature')
        genesData = await fetchJSON(ORPHADATA_URLS.genes, 'Genes')
        epidemiologyData = await fetchJSON(ORPHADATA_URLS.epidemiology, 'Epidemiology')
    }

    if (!nomenclatureData) {
        console.error('❌ Nomenclature データの取得に失敗。処理を中断します。')
        console.log('\n💡 ヒント: Orphadataから手動でJSONをダウンロードし、--local オプションで指定してください:')
        console.log('   https://sciences.orphadata.com/orphanet-scientific-knowledge-files/')
        console.log('   npx tsx scripts/etl/fetch-orphadata.ts --local ./data/orphanet-raw/')
        return []
    }

    // Step 2: Nomenclature から疾患マスターを構築
    console.log('\n📊 疾患マスターを構築中...')

    // Orphadata JSONの構造に応じてパース
    // JSONの正確な構造はバージョンによって異なるため、柔軟にパース
    const disorders: OrphaDisorder[] = extractDisorders(nomenclatureData)
    console.log(`  全エントリ: ${disorders.length}`)

    // 疾患タイプでフィルター
    const filtered = disorders.filter(d => {
        const typeName = getLocalizedValue(d.DisorderType?.Name, 'en')
        return disorderTypes.includes(typeName)
    })
    console.log(`  フィルター後（${disorderTypes.join('/')}）: ${filtered.length}`)

    // 上限適用
    const target = maxDiseases ? filtered.slice(0, maxDiseases) : filtered
    console.log(`  処理対象: ${target.length} 疾患`)

    // Step 3: 遺伝子マッピング構築
    const geneMap = new Map<number, OrphanetDiseaseRecord['associated_genes']>()
    if (genesData) {
        const geneAssociations = extractGeneAssociations(genesData)
        console.log(`\n🧬 遺伝子関連: ${geneAssociations.length} エントリ`)
        for (const ga of geneAssociations) {
            if (!geneMap.has(ga.ORPHAcode)) {
                geneMap.set(ga.ORPHAcode, [])
            }
            geneMap.get(ga.ORPHAcode)!.push({
                symbol: ga.Gene.Symbol,
                name: getLocalizedValue(ga.Gene.Name, 'en'),
                association_type: getLocalizedValue(ga.DisorderGeneAssociationType?.Name, 'en'),
            })
        }
    }

    // Step 4: 疫学マッピング構築
    const epiMap = new Map<number, { prevalence: string | null; prevalence_class: string | null; inheritance: string[]; age_of_onset: string[] }>()
    if (epidemiologyData) {
        const epiEntries = extractEpidemiology(epidemiologyData)
        console.log(`📈 疫学データ: ${epiEntries.length} エントリ`)
        for (const epi of epiEntries) {
            const inheritance = (epi.TypeOfInheritance || [])
                .map(t => mapInheritance(getLocalizedValue(t.Name, 'en')))
                .filter(Boolean)

            const ageOfOnset = (epi.AverageAgeOfOnset || [])
                .map(a => mapAgeOfOnset(getLocalizedValue(a.Name, 'en')))
                .filter(Boolean)

            let prevalenceClass: string | null = null
            let prevalence: string | null = null
            if (epi.Prevalence && epi.Prevalence.length > 0) {
                const p = epi.Prevalence[0]
                prevalenceClass = getLocalizedValue(p.PrevalenceClass?.Name, 'en') || null
                prevalence = mapPrevalence(prevalenceClass || '')
            }

            epiMap.set(epi.ORPHAcode, {
                prevalence,
                prevalence_class: prevalenceClass,
                inheritance,
                age_of_onset: ageOfOnset,
            })
        }
    }

    // Step 5: 統合レコード生成
    console.log('\n🔄 統合レコードを生成中...')
    const now = new Date().toISOString()
    const records: OrphanetDiseaseRecord[] = target.map(d => {
        const epi = epiMap.get(d.ORPHAcode) || { prevalence: null, prevalence_class: null, inheritance: [], age_of_onset: [] }
        const genes = geneMap.get(d.ORPHAcode) || []

        return {
            orphacode: `ORPHA:${d.ORPHAcode}`,
            name_en: getLocalizedValue(d.Name, 'en'),
            name_ja: getLocalizedValue(d.Name, 'ja', true), // strict: 日本語がなければ空文字
            description_en: getLocalizedValue(d.TextAuto?.Info, 'en') || null,
            description_ja: null, // 後で難病情報センター等と統合
            disorder_type: getLocalizedValue(d.DisorderType?.Name, 'en'),
            disorder_group: getLocalizedValue(d.DisorderGroup?.Name, 'en'),
            expert_link: d.ExpertLink || `https://www.orpha.net/en/disease/detail/${d.ORPHAcode}`,
            prevalence: epi.prevalence,
            prevalence_class: epi.prevalence_class,
            inheritance: epi.inheritance,
            age_of_onset: epi.age_of_onset,
            associated_genes: genes,
            hpo_associations: [], // HPOは別途Phase A-3で統合
            source: 'orphanet' as const,
            source_version: '2024-07',
            imported_at: now,
        }
    })

    // Step 6: 出力
    fs.mkdirSync(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, 'orphanet-diseases.json')
    fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf-8')

    console.log(`\n✅ 統合完了!`)
    console.log(`  疾患数: ${records.length}`)
    console.log(`  遺伝子関連: ${records.filter(r => r.associated_genes.length > 0).length} 疾患`)
    console.log(`  疫学データ: ${records.filter(r => r.prevalence !== null).length} 疾患`)
    console.log(`  出力: ${outputPath}`)

    // 統計サマリー
    console.log('\n📊 カテゴリ別統計:')
    const typeCounts = new Map<string, number>()
    for (const r of records) {
        typeCounts.set(r.disorder_type, (typeCounts.get(r.disorder_type) || 0) + 1)
    }
    for (const [type, count] of typeCounts) {
        console.log(`  ${type}: ${count}`)
    }

    return records
}

// ─────────────────────────────────────────────
// JSONパース補助（Orphadata構造対応）
// ─────────────────────────────────────────────

function extractDisorders(data: any): OrphaDisorder[] {
    // Orphadata JSONの構造は複数パターンがある
    if (Array.isArray(data)) return data
    if (data?.JDBOR?.DisorderList?.Disorder) return data.JDBOR.DisorderList.Disorder
    if (data?.DisorderList?.Disorder) return data.DisorderList.Disorder
    if (data?.Disorder) return Array.isArray(data.Disorder) ? data.Disorder : [data.Disorder]

    // ネストを探索
    for (const key of Object.keys(data || {})) {
        const result = extractDisorders(data[key])
        if (result.length > 0) return result
    }

    console.warn('⚠️ 疾患データの構造を特定できませんでした。キー:', Object.keys(data || {}))
    return []
}

function extractGeneAssociations(data: any): OrphaGeneAssociation[] {
    if (Array.isArray(data)) return data
    if (data?.JDBOR?.DisorderList?.Disorder) {
        // 遺伝子データは疾患内にネストされているパターン
        const disorders = data.JDBOR.DisorderList.Disorder
        const result: OrphaGeneAssociation[] = []
        for (const d of disorders) {
            const genes = d.DisorderGeneAssociationList?.DisorderGeneAssociation
            if (genes) {
                for (const g of (Array.isArray(genes) ? genes : [genes])) {
                    result.push({
                        ORPHAcode: d.ORPHAcode,
                        Gene: g.Gene,
                        DisorderGeneAssociationType: g.DisorderGeneAssociationType,
                    })
                }
            }
        }
        return result
    }
    return []
}

function extractEpidemiology(data: any): OrphaEpidemiology[] {
    if (Array.isArray(data)) return data
    if (data?.JDBOR?.DisorderList?.Disorder) {
        return data.JDBOR.DisorderList.Disorder.map((d: any) => ({
            ORPHAcode: d.ORPHAcode,
            AverageAgeOfOnset: d.AverageAgeOfOnsetList?.AverageAgeOfOnset
                ? (Array.isArray(d.AverageAgeOfOnsetList.AverageAgeOfOnset)
                    ? d.AverageAgeOfOnsetList.AverageAgeOfOnset
                    : [d.AverageAgeOfOnsetList.AverageAgeOfOnset])
                : [],
            TypeOfInheritance: d.TypeOfInheritanceList?.TypeOfInheritance
                ? (Array.isArray(d.TypeOfInheritanceList.TypeOfInheritance)
                    ? d.TypeOfInheritanceList.TypeOfInheritance
                    : [d.TypeOfInheritanceList.TypeOfInheritance])
                : [],
            Prevalence: d.PrevalenceList?.Prevalence
                ? (Array.isArray(d.PrevalenceList.Prevalence)
                    ? d.PrevalenceList.Prevalence
                    : [d.PrevalenceList.Prevalence])
                : [],
        }))
    }
    return []
}

// ─────────────────────────────────────────────
// CLIエントリポイント
// ─────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2)
    const localIdx = args.indexOf('--local')
    const maxIdx = args.indexOf('--max')

    const options: Parameters<typeof buildOrphanetDatabase>[0] = {}

    if (localIdx !== -1 && args[localIdx + 1]) {
        options.localDataDir = path.resolve(args[localIdx + 1])
    }
    if (maxIdx !== -1 && args[maxIdx + 1]) {
        options.maxDiseases = parseInt(args[maxIdx + 1], 10)
    }

    const records = await buildOrphanetDatabase(options)

    if (records.length === 0) {
        console.log('\n❌ レコードが生成されませんでした。')
        process.exit(1)
    }

    console.log(`\n🎉 パイプライン完了: ${records.length} 疾患をインポートしました。`)
}

main().catch(console.error)
