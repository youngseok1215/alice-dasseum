// 사진 라벨과 확인한 공식 설명을 정리한 제품 정보. 구매 조언은 AI가 생성합니다.
const profiles = [
  {
    id: 'illiyoon-ceramide-ato-lotion',
    type: 'body-lotion',
    name: '일리윤 세라마이드 아토 로션',
    aliases: ['세라마이드아토로션', 'ceramideatolotion'],
    excludes: ['크림', 'cream', '수딩젤', 'soothinggel'],
    facts: ['민감·건조 피부용 보습 로션', '사진 라벨에 소이 세라마이드와 마데카소사이드, 무향 표시', '제조사는 보습·피부 장벽·진정 관리를 강조'],
    sources: [{ label: '아모레퍼시픽 공식 설명', url: 'https://www.apgroup.com/int/ko/news/2025-02-05-1.html' }],
  },
  {
    id: 'cetaphil-moisturising-lotion',
    type: 'body-lotion',
    name: '세타필 모이스춰라이징 로션',
    aliases: ['세타필모이스춰라이징로션', '세타필모이스처라이징로션', 'cetaphilmoisturisinglotion', 'cetaphilmoisturizinglotion'],
    excludes: ['크림', 'cream', '세라마이드', 'ceramide', '베이비', 'baby'],
    facts: ['건성~중성·민감 피부용 데일리 보습 로션', '공식 설명에 아보카도 오일·나이아신아마이드·판테놀·글리세린 기재', '제조사는 가벼운 제형과 수분 공급을 강조'],
    sources: [{ label: '세타필 공식 제품 정보', url: 'https://www.cetaphil.co.kr/moisturizers/모이스춰라이징-로션/KR_302990241334-237.html' }],
  },
  {
    id: 'medicube-zero-pore-pad',
    type: 'toner-pad',
    name: '메디큐브 제로 모공 패드 2.0',
    aliases: ['제로모공패드', '제로포어패드', 'zeroporepad'],
    excludes: ['마일드', 'mild', '제로모공패드30', 'zeroporepad30', '3세대'],
    facts: ['모공·피지·각질 정돈을 강조하는 데일리 토너 패드', '사진 라벨에 AHA·BHA·판테놀·소듐하이알루로네이트 표시', '대표 성분 표시를 바탕으로 각질 정돈 목적과 비교 가능'],
    sources: [{ label: '메디큐브 공식 제품 정보', url: 'https://themedicube.co.kr/product/detail.html?product_no=102' }],
  },
  {
    id: 'abib-heartleaf-calming-touch',
    type: 'toner-pad',
    name: '아비브 어성초 스팟 패드 카밍터치',
    aliases: ['어성초스팟패드카밍터치', 'heartleafspotpadcalmingtouch', '아비브어성초패드', '아비브어성초스팟패드'],
    excludes: ['클리어', 'clear', '흔적', '에센스패드', 'essencepad', '마스크', 'mask'],
    facts: ['어성초 추출물을 담은 진정 관리 토너 패드', '공식 설명에서 쿨링·진정과 부드러운 면·엠보 양면 패드를 강조', '개인별 자극 여부와 효과의 우열은 이 설명만으로 판단할 수 없음'],
    sources: [{ label: '아비브 공식 제품 정보', url: 'https://en.abib.com/products/calming-touch' }],
  },
  {
    id: 'febreze-downy-hotel-white-tea',
    type: 'fabric-deodorizer',
    name: '페브리즈 다우니 호텔 컬렉션 화이트 티',
    aliases: ['다우니호텔컬렉션화이트티', 'downyhotelcollectionwhitetea', '페브리즈화이트티', 'febrezewhitetea'],
    excludes: ['리필', 'refill', '다른향'],
    facts: ['사용자 제공 사진의 제품 라벨에 섬유스프레이와 WHITE TEA 표시', '향 표기는 화이트 티', '탈취·살균 성능이나 사용 가능한 소재는 뒷면 라벨 확인 필요'],
    sources: [{ label: '사용자가 제공한 제품 앞면 라벨' }],
  },
  {
    id: 'fiji-moraxella-herb',
    type: 'fabric-deodorizer',
    name: '피지 모락셀라 섬유탈취제 상쾌한 허브향',
    aliases: ['모락셀라섬유탈취제상쾌한허브향', '모락셀라상쾌한허브향', '모락셀라섬유탈취제허브', 'moraxellafabricdeodorizerherb'],
    excludes: ['유연제', 'softener', '코튼', 'cotton', '피치', 'peach', '머스크', 'musk'],
    facts: ['사진 라벨에 섬유탈취제·상쾌한 허브향 표시', '향 표기는 허브향', '탈취 성능의 수치·시험 조건과 사용 가능한 소재는 별도 라벨 확인 필요'],
    sources: [{ label: 'LG생활건강 공식몰 제품 정보', url: 'https://www.lgcaremall.com/product/detail/S10065790' }],
  },
];

function normalized(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase().replace(/[^가-힣a-z0-9]/g, '');
}

export function findProductProfile(name) {
  const key = normalized(name);
  const matches = profiles.filter((profile) =>
    profile.aliases.some((alias) => key.includes(normalized(alias))) &&
    !profile.excludes.some((excluded) => key.includes(normalized(excluded))),
  );
  if (matches.length !== 1) return undefined;
  const { id, type, name: productName, facts, sources } = matches[0];
  return { id, type, name: productName, facts, sources };
}
