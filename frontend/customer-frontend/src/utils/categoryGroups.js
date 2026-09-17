export const CATEGORY_GROUPS = [
  {
    id: 'fashion',
    label: '패션의류/잡화',
    icon: 'shirt',
    aliases: ['패션', '패션/신발', '상의', '하의', '신발', '가방', '잡화'],
    subs: [
      { id: 'women-fashion', label: '여성패션', terms: ['여성', '원피스', '스커트', '블라우스'] },
      { id: 'men-fashion', label: '남성패션', terms: ['남성', '셔츠', '슬랙스', '맨투맨'] },
      { id: 'shoes', label: '신발', terms: ['신발', '러닝화', '스니커즈', '클로그', '아쿠아슈즈'] },
      { id: 'bags', label: '가방/잡화', terms: ['가방', '백팩', '지갑', '잡화'] },
      { id: 'sports-fashion', label: '스포츠패션', terms: ['나이키', '아디다스', '레깅스', '요가', '저지'] },
      { id: 'underwear', label: '언더웨어/이너웨어', terms: ['팬티', '이너웨어', '속옷'] },
    ],
  },
  {
    id: 'beauty',
    label: '뷰티',
    icon: 'sparkles',
    aliases: ['뷰티', '스킨케어', '메이크업/클렌징', '메이크업', '클렌징'],
    subs: [
      { id: 'skincare', label: '스킨케어', terms: ['토너', '세럼', '크림', '에센스', '선크림'] },
      { id: 'cleansing', label: '클렌징', terms: ['클렌징', '세안'] },
      { id: 'makeup', label: '메이크업', terms: ['쿠션', '틴트', '아이', '퍼프', '메이크업'] },
      { id: 'hair', label: '헤어케어', terms: ['샴푸', '헤어'] },
      { id: 'body', label: '바디케어', terms: ['바디', '비누', '풋스파'] },
      { id: 'beauty-tools', label: '뷰티소품', terms: ['손톱', '퍼프', '정리함', '세안'] },
    ],
  },
  {
    id: 'baby',
    label: '출산/유아동',
    icon: 'baby',
    aliases: ['출산/유아동', '유아동', '출산'],
    subs: [
      { id: 'diaper', label: '기저귀/물티슈', terms: ['기저귀', '물티슈'] },
      { id: 'feeding', label: '수유/이유용품', terms: ['수유', '이유', '치발기', '과즙망'] },
      { id: 'kids-food', label: '분유/어린이식품', terms: ['분유', '어린이식품'] },
      { id: 'kids-fashion', label: '유아동패션', terms: ['아동', '유아', '임산부'] },
      { id: 'kids-living', label: '유아생활용품', terms: ['식판', '물병', '수영장', '장난감'] },
      { id: 'kids-play', label: '유아놀이/외출', terms: ['오뚝이', '아쿠아슈즈', '튜브'] },
    ],
  },
  {
    id: 'food',
    label: '식품',
    icon: 'apple',
    aliases: ['식품', '생수/음료', '라면/즉석식품', '과자/커피', '커피'],
    subs: [
      { id: 'drink', label: '생수/음료', terms: ['생수', '음료', '콜라', '사이다', '에너지'] },
      { id: 'instant', label: '라면/즉석식품', terms: ['라면', '햇반', '즉석', '만두', '떡볶이'] },
      { id: 'snack', label: '과자/간식', terms: ['과자', '초코', '스낵', '너겟', '프로틴바'] },
      { id: 'coffee', label: '커피/차', terms: ['커피', '카누', '맥심', '차'] },
      { id: 'fresh', label: '신선식품', terms: ['두부', '꽃게', '멸치', '청갓', '도라지'] },
      { id: 'side-dish', label: '반찬/김/양념', terms: ['김', '게장', '꿀', '양념'] },
    ],
  },
  {
    id: 'kitchen',
    label: '주방용품',
    icon: 'cookingPot',
    aliases: ['주방용품', '주방'],
    subs: [
      { id: 'cookware', label: '냄비/프라이팬', terms: ['냄비', '프라이팬', '가마솥'] },
      { id: 'tableware', label: '식기/수저', terms: ['스푼', '식판', '식기'] },
      { id: 'storage', label: '보관용기', terms: ['도시락', '보관', '용기', '생수병'] },
      { id: 'cup', label: '컵/텀블러', terms: ['텀블러', '컵', '계량컵'] },
      { id: 'tools', label: '조리도구', terms: ['국자', '스푼', '받침대'] },
      { id: 'kitchen-supplies', label: '주방소모품', terms: ['필터', '포장', '비닐', '지퍼백'] },
    ],
  },
  {
    id: 'living',
    label: '생활용품',
    icon: 'sprayCan',
    aliases: ['생활용품', '세제/생활', '욕실/위생', '수납'],
    subs: [
      { id: 'laundry', label: '세제/세탁', terms: ['세제', '섬유유연제', '세탁'] },
      { id: 'bath', label: '욕실/위생', terms: ['욕실', '칫솔', '치약', '화장지', '면도'] },
      { id: 'cleaning', label: '청소용품', terms: ['청소', '수세미', '행주', '트랩'] },
      { id: 'organize', label: '수납/정리', terms: ['수납', '정리', '압축', '정리함'] },
      { id: 'daily', label: '생활잡화', terms: ['생활', '스트랩', '리모컨', '어댑터'] },
      { id: 'diy', label: '공구/DIY', terms: ['드라이버', '용접', '공구'] },
    ],
  },
  {
    id: 'interior',
    label: '홈인테리어',
    icon: 'lamp',
    aliases: ['홈인테리어', '침구', '가구'],
    subs: [
      { id: 'bedding', label: '침구/토퍼', terms: ['이불', '침구', '토퍼', '매트리스'] },
      { id: 'furniture', label: '가구', terms: ['침대', '책장', '수납장', '화장대'] },
      { id: 'decor', label: '홈데코', terms: ['액자', '데코', '인테리어'] },
      { id: 'storage-furniture', label: '수납가구', terms: ['책장', '수납장', '정리함'] },
      { id: 'light', label: '조명/거울', terms: ['LED', '거울', '화장대'] },
      { id: 'season', label: '시즌홈', terms: ['보온', '쿨러', '여름'] },
    ],
  },
  {
    id: 'appliance',
    label: '가전디지털',
    icon: 'monitorSmartphone',
    aliases: ['가전디지털', '오디오', '모니터'],
    subs: [
      { id: 'small-appliance', label: '생활가전', terms: ['가습기', '가전'] },
      { id: 'audio', label: '음향가전', terms: ['이어폰', '헤드폰', '스피커', '버즈', 'AirPods'] },
      { id: 'accessory', label: '디지털액세서리', terms: ['충전기', '케이블', 'microSD', '메모리'] },
      { id: 'monitor', label: '모니터/디스플레이', terms: ['모니터'] },
      { id: 'mouse-keyboard', label: '키보드/마우스', terms: ['키보드', '마우스', '로지텍'] },
      { id: 'portable', label: '휴대용 디지털', terms: ['이어폰', '헤드폰', '충전기'] },
    ],
  },
  {
    id: 'computer-mobile',
    label: '컴퓨터/모바일',
    icon: 'laptop',
    aliases: ['전자제품', '노트북', '스마트폰', '태블릿', '디지털/주변기기'],
    subs: [
      { id: 'laptop', label: '노트북', terms: ['노트북', 'Laptop'] },
      { id: 'smartphone', label: '스마트폰', terms: ['스마트폰', '갤럭시', 'iPhone'] },
      { id: 'tablet', label: '태블릿', terms: ['태블릿', 'iPad'] },
      { id: 'pc-accessory', label: 'PC주변기기', terms: ['마우스', '키보드', '모니터'] },
      { id: 'charging', label: '충전/케이블', terms: ['충전기', 'USB', '케이블'] },
      { id: 'storage-memory', label: '저장장치/메모리', terms: ['microSD', 'SSD', '메모리'] },
    ],
  },
  {
    id: 'sports',
    label: '스포츠/레저',
    icon: 'dumbbell',
    aliases: ['스포츠/레저', '스포츠', '캠핑', '요가'],
    subs: [
      { id: 'fitness', label: '헬스/웨이트', terms: ['덤벨', '아령', '웨이트', '실내자전거'] },
      { id: 'yoga', label: '요가/필라테스', terms: ['요가', '필라테스', '매트'] },
      { id: 'camping', label: '캠핑/아웃도어', terms: ['캠핑', '쿨러', '텐트'] },
      { id: 'golf', label: '골프', terms: ['골프'] },
      { id: 'swim', label: '수영/수상스포츠', terms: ['수영', '아쿠아', '워터'] },
      { id: 'ball', label: '구기/팀스포츠', terms: ['축구', '공', '저지'] },
    ],
  },
  {
    id: 'car',
    label: '자동차용품',
    icon: 'car',
    aliases: ['자동차용품', '자동차'],
    subs: [
      { id: 'car-interior', label: '차량인테리어', terms: ['핸들커버', '시트', '방석'] },
      { id: 'car-charge', label: '차량용 충전기', terms: ['차량용', '충전기'] },
      { id: 'car-care', label: '세차/관리', terms: ['세차', '관리'] },
      { id: 'car-safety', label: '안전/비상용품', terms: ['안전', '반사', '벨트'] },
      { id: 'car-storage', label: '수납/정리', terms: ['차량', '수납'] },
      { id: 'car-accessory', label: '차량 액세서리', terms: ['핸들', '커버', '어댑터'] },
    ],
  },
  {
    id: 'office',
    label: '도서/문구/오피스',
    icon: 'bookOpen',
    aliases: ['문구/오피스', '문구', '오피스', '도서'],
    subs: [
      { id: 'stationery', label: '필기구/문구', terms: ['사인펜', '지우개', '문구'] },
      { id: 'album', label: '앨범/포토', terms: ['앨범', '포토'] },
      { id: 'board', label: '화이트보드', terms: ['화이트보드', '보드'] },
      { id: 'office', label: '오피스용품', terms: ['A4', '오피스', '자석'] },
      { id: 'art', label: '미술/제도', terms: ['미술', '보석십자수'] },
      { id: 'packing', label: '포장/정리', terms: ['포장', '파일'] },
    ],
  },
  {
    id: 'toy-hobby',
    label: '완구/취미',
    icon: 'puzzle',
    aliases: ['완구/취미', '완구', '취미'],
    subs: [
      { id: 'character', label: '캐릭터완구', terms: ['뽀로로', '피규어', '캐릭터'] },
      { id: 'outdoor-toy', label: '야외완구', terms: ['물총', '눈오리', '눈집게'] },
      { id: 'party', label: '파티용품', terms: ['풍선', '파티'] },
      { id: 'diy-hobby', label: 'DIY/만들기', terms: ['보석십자수', '핸드메이드', '마끈'] },
      { id: 'figure', label: '피규어/소품', terms: ['피규어', '소품'] },
      { id: 'collect', label: '수집/취미', terms: ['취미', '프리미엄'] },
    ],
  },
  {
    id: 'pet',
    label: '반려동물용품',
    icon: 'pawPrint',
    aliases: ['반려동물용품', '반려동물'],
    subs: [
      { id: 'dog', label: '강아지용품', terms: ['강아지', '반려동물'] },
      { id: 'cat', label: '고양이용품', terms: ['고양이', '반려동물'] },
      { id: 'pet-bed', label: '하우스/쿠션', terms: ['쿠션', '하우스'] },
      { id: 'pet-fashion', label: '목줄/패션', terms: ['목걸이', '목줄', '나비넥타이'] },
      { id: 'pet-food', label: '사료/간식', terms: ['사료', '간식'] },
      { id: 'pet-care', label: '위생/관리', terms: ['위생', '관리'] },
    ],
  },
  {
    id: 'health',
    label: '헬스/건강식품',
    icon: 'heartPulse',
    aliases: ['헬스/건강식품', '건강식품', '헬스'],
    subs: [
      { id: 'vitamin', label: '비타민/영양제', terms: ['비타민', '영양'] },
      { id: 'probiotics', label: '유산균', terms: ['유산균', '락토핏'] },
      { id: 'protein', label: '단백질/프로틴', terms: ['프로틴', '단백질', '웨이'] },
      { id: 'diet', label: '다이어트', terms: ['다이어트', 'BNR17'] },
      { id: 'energy', label: '운동보충제', terms: ['아르기닌', '에너지부스터'] },
      { id: 'health-food', label: '건강식품', terms: ['건강', '보충'] },
    ],
  },
]

export function getCategoryGroup(groupId) {
  return CATEGORY_GROUPS.find((group) => group.id === groupId) || null
}

export function getCategorySub(groupId, subId) {
  return getCategoryGroup(groupId)?.subs.find((sub) => sub.id === subId) || null
}

export function matchesGroup(categoryName, group) {
  const name = String(categoryName || '').trim().toLowerCase()
  if (!name || !group) return false
  return group.aliases.some((alias) => {
    const normalized = alias.toLowerCase()
    return name === normalized || name.includes(normalized) || normalized.includes(name)
  })
}

export function matchesSubcategory(product, sub) {
  if (!sub) return true
  const haystack = [product?.product_name, product?.short_description, product?.description, product?.category_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return sub.terms.some((term) => haystack.includes(String(term).toLowerCase()))
}
