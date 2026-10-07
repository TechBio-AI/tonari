// 疾患ページの構造化データ（lib/portal/disease-jsonld.ts が組み立てたものを埋め込むだけ）

import { buildDiseaseJsonLd, serializeJsonLd, type DiseaseJsonLdInput } from '@/lib/portal/disease-jsonld'

export function DiseaseJsonLd(props: DiseaseJsonLdInput) {
  return (
    <script
      type="application/ld+json"
      data-disease-jsonld
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildDiseaseJsonLd(props)) }}
    />
  )
}
