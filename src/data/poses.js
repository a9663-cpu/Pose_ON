/**
 * 포즈 데이터 — 이 파일 하나만 고치면 포즈를 추가/교체/삭제할 수 있다.
 *
 * 새 포즈 추가법
 *   1. 이미지를 `pose_images/` 폴더에 넣는다. (jpg / jpeg / png / webp)
 *   2. 아래 POSES 배열에 항목을 하나 추가한다.
 *        id     : 중복되지 않는 문자열 (찜 저장 키로 쓰인다. 한번 정하면 바꾸지 말 것)
 *        file   : pose_images 안의 파일명
 *        people : 1 | 2 | 3   (3 = "3명 이상")
 *        moods  : ['hip' | 'meme' | 'sweet'] — 여러 개 붙일 수 있다
 *                 sweet 은 인원 수에 따라 화면에서 '귀여운 / 커플 / 다정한' 으로 이름만 바뀐다
 *        title  : 카드에 크게 보이는 포즈 이름
 *        tip    : 실제로 어떻게 찍는지 한 줄 가이드
 *
 * @typedef {1 | 2 | 3} PeopleCount
 * @typedef {'hip' | 'meme' | 'sweet'} MoodId
 * @typedef {{ id: string, file: string, people: PeopleCount, moods: MoodId[], title: string, tip: string }} Pose
 */

/** 이미지가 실제로 들어 있는 폴더. 폴더 이름을 바꾸면 여기만 고치면 된다. */
export const IMAGE_DIR = 'pose_images';

/** @type {{ value: PeopleCount, label: string, hint: string }[]} */
export const PEOPLE_OPTIONS = [
  { value: 1, label: '1명', hint: '혼자서도 완벽하게' },
  { value: 2, label: '2명', hint: '둘이 맞추는 호흡' },
  { value: 3, label: '3명 이상', hint: '다 같이 한 프레임에' },
];

/** 저장된 값이 아직 유효한지 검사할 때 쓴다. @type {MoodId[]} */
export const MOOD_IDS = ['hip', 'meme', 'sweet'];

/**
 * '커플'은 두 명일 때만 성립하는 말이라, 같은 무드(sweet)를 인원 수에 맞는 이름으로 바꿔 보여준다.
 * 데이터의 무드 id 는 그대로 두기 때문에 인원 수를 바꿔도 선택한 무드가 풀리지 않는다.
 */
const SWEET_LABEL_BY_PEOPLE = {
  1: { label: '귀여운', hint: '사랑스럽고 러블리하게' },
  2: { label: '커플', hint: '다정하고 달달하게' },
  3: { label: '다정한', hint: '서로 붙어서 친밀하게' },
};

/**
 * @param {PeopleCount | null} people
 * @returns {{ id: MoodId, label: string, hint: string }[]}
 */
export function getMoodOptions(people) {
  const sweet = SWEET_LABEL_BY_PEOPLE[people ?? 2] ?? SWEET_LABEL_BY_PEOPLE[2];
  return [
    { id: 'hip', label: '힙한', hint: '시크하고 트렌디하게' },
    { id: 'meme', label: '밈', hint: '웃기고 과장되게' },
    { id: 'sweet', label: sweet.label, hint: sweet.hint },
  ];
}

/** @type {Pose[]} */
export const POSES = [
  // ── 1명 ──────────────────────────────────────────────
  {
    id: 'pose1',
    file: 'pose1.jpg',
    people: 1,
    moods: ['meme', 'sweet'],
    title: '볼 콕 윙크',
    tip: '한 손은 허리에, 반대 손 검지로 볼을 콕 누르고 한쪽 눈만 감기',
  },
  {
    id: 'pose11',
    file: 'pose11.jpeg',
    people: 1,
    moods: ['hip'],
    title: '손가락 총',
    tip: '몸은 살짝 틀고 한 팔만 카메라로 쭉 뻗어 손가락으로 겨누기',
  },
  {
    id: 'pose12',
    file: 'pose12.jpeg',
    people: 1,
    moods: ['meme'],
    title: '무심한 엄지척',
    tip: '엄지는 렌즈 쪽으로 쭉, 표정은 끝까지 무표정 유지하기',
  },
  {
    id: 'pose15',
    file: 'pose15.webp',
    people: 1,
    moods: ['hip'],
    title: '로우 스탠스',
    tip: '무릎 굽혀 무게중심 낮추고 한 손바닥은 얼굴 옆으로 세우기',
  },
  {
    id: 'pose16',
    file: 'pose16.jpg',
    people: 1,
    moods: ['hip'],
    title: '카메라 정조준',
    tip: '한 손은 주머니에 꽂고 반대 손만 렌즈 정면으로 뻗기',
  },
  {
    id: 'pose17',
    file: 'pose17.jpeg',
    people: 1,
    moods: ['hip'],
    title: '너 지목',
    tip: '허리에 한 손, 반대 손 검지로 카메라를 콕 찍듯 가리키기',
  },
  {
    id: 'pose18',
    file: 'pose18.jpg',
    people: 1,
    moods: ['hip'],
    title: '와이드 스탠스',
    tip: '다리 넓게 벌리고 양손은 얼굴 옆에서 손가락 펴기',
  },
  {
    id: 'pose19',
    file: 'pose19.jpg',
    people: 1,
    moods: ['hip', 'sweet'],
    title: '머리 위 아치',
    tip: '두 팔을 머리 위로 올려 동그랗게 모으고 다리는 꼬아 세우기',
  },
  {
    id: 'pose20',
    file: 'pose20.jpg',
    people: 1,
    moods: ['hip'],
    title: '사선 스텝',
    tip: '몸을 사선으로 두고 한 팔은 가슴 앞, 한 다리는 뒤로 빼기',
  },
  {
    id: 'pose21',
    file: 'pose21.webp',
    people: 1,
    moods: ['meme'],
    title: '승리의 포효',
    tip: '입 크게 벌리고 두 주먹을 쥔 채 팔을 활짝 열기',
  },
  {
    id: 'pose22',
    file: 'pose22.jpg',
    people: 1,
    moods: ['hip'],
    title: '턱 괴고 시크',
    tip: '한쪽 다리를 앞으로 꼬고 손끝만 턱에 살짝 대기',
  },
  {
    id: 'pose23',
    file: 'pose23.jpg',
    people: 1,
    moods: ['hip'],
    title: '상체 숙여 포인팅',
    tip: '상체를 앞으로 살짝 숙이면서 검지로 카메라 찍기',
  },
  {
    id: 'pose24',
    file: 'pose24.jpeg',
    people: 1,
    moods: ['hip'],
    title: '바닥 스플릿',
    tip: '다리를 넓게 벌려 바닥을 두 손으로 짚고 정면 응시',
  },
  {
    id: 'pose25',
    file: 'pose25.jpeg',
    people: 1,
    moods: ['hip', 'sweet'],
    title: '팔 하트',
    tip: '두 팔을 머리 위에서 모아 삼각형 하트 만들기',
  },
  {
    id: 'pose31',
    file: 'pose31.jpeg',
    people: 1,
    moods: ['hip'],
    title: '양손 아이템',
    tip: '양손에 소품(음료·폰)을 하나씩 들고 카메라 앞으로 내밀기',
  },
  {
    id: 'pose34',
    file: 'pose34.webp',
    people: 1,
    moods: ['meme'],
    title: '한 팔 뻗어 브이',
    tip: '한 팔은 옆으로 길게 뻗고 반대 팔은 머리 뒤로 넘기기',
  },
  {
    id: 'pose35',
    file: 'pose35.jpeg',
    people: 1,
    moods: ['meme'],
    title: '3단 표정 변주',
    tip: '자세는 그대로 두고 컷마다 표정만 크게 바꾸기',
  },
  {
    id: 'pose57',
    file: 'cyVFIyvYfS5REkUyuNL_pRTDrCu66apTvbS1NBwr1ZtaTOtT4_FXYH8-cWawnGJ7hD7nC6_3KLCv9XljuafclA.webp',
    people: 1,
    moods: ['meme', 'sweet'],
    title: '두 손으로 얼굴 감싸기',
    tip: '양손을 뺨에 대고 눈은 크게, 고개는 살짝 기울이기',
  },
  {
    id: 'pose58',
    file: 'f44c52ef48d7d363c7593bdb1c8b45a1.jpg',
    people: 1,
    moods: ['meme'],
    title: '충격받은 표정',
    tip: '두 손을 머리 뒤로 올리고 눈과 입을 최대한 크게 벌리기',
  },

  // ── 2명 ──────────────────────────────────────────────
  {
    id: 'pose2',
    file: 'pose2.jpeg',
    people: 2,
    moods: ['sweet', 'hip'],
    title: '백 투 백',
    tip: '등을 살짝 겹치게 붙이고 둘 다 고개만 카메라로 돌리기',
  },
  {
    id: 'pose3',
    file: 'pose3.jpeg',
    people: 2,
    moods: ['sweet', 'meme'],
    title: '앉고 서고',
    tip: '한 명은 정면으로 서고, 한 명은 다리 옆에 앉아 기대기',
  },
  {
    id: 'pose4',
    file: 'pose4.jpeg',
    people: 2,
    moods: ['sweet'],
    title: '안아 올리기',
    tip: '뒤에서 허리를 감싸 살짝 들어올리고 앞사람은 팔 활짝 펴기',
  },
  {
    id: 'pose5',
    file: 'pose5.jpeg',
    people: 2,
    moods: ['sweet', 'hip'],
    title: '손잡고 무릎 업',
    tip: '등 맞대고 손을 잡은 채 서로 바깥쪽 무릎을 함께 들기',
  },
  {
    id: 'pose9',
    file: 'pose9.jpeg',
    people: 2,
    moods: ['meme'],
    title: '인간 손수레',
    tip: '한 명이 두 손으로 바닥을 짚으면 다른 한 명이 다리 들어주기',
  },
  {
    id: 'pose10',
    file: 'pose10.jpeg',
    people: 2,
    moods: ['hip'],
    title: '엎드려 턱 괴기',
    tip: '나란히 엎드려 두 손으로 턱을 받치고 무표정으로 정면 보기',
  },
  {
    id: 'pose13',
    file: 'pose13.jpeg',
    people: 2,
    moods: ['meme'],
    title: '밈 듀오',
    tip: '한 명은 놀란 듯 두 손 뻗고, 한 명은 팔을 머리 뒤로 넘겨 여유롭게',
  },
  {
    id: 'pose26',
    file: 'pose26.jpg',
    people: 2,
    moods: ['meme'],
    title: '무릎 꿇고 리액션',
    tip: '앞사람은 한쪽 무릎 꿇고, 뒷사람은 팔 벌려 놀란 표정 짓기',
  },
  {
    id: 'pose27',
    file: 'pose27.jpg',
    people: 2,
    moods: ['meme'],
    title: '손바닥 맞대기',
    tip: '가운데서 손바닥을 마주 대고 바깥쪽 다리를 동시에 쭉 뻗기',
  },
  {
    id: 'pose28',
    file: 'pose28.jpg',
    people: 2,
    moods: ['sweet'],
    title: '머리 위 하트',
    tip: '안쪽 팔을 머리 위로 모아 하트를 만들고 바깥 손은 브이',
  },
  {
    id: 'pose29',
    file: 'pose29.jpg',
    people: 2,
    moods: ['sweet'],
    title: '손가락 하트',
    tip: '두 사람 가운데에서 손을 모아 하트 하나를 같이 만들기',
  },
  {
    id: 'pose30',
    file: 'pose30.webp',
    people: 2,
    moods: ['meme'],
    title: '각자 손동작',
    tip: '서로 다른 손동작을 하나씩 잡고 표정은 담백하게',
  },
  {
    id: 'pose38',
    file: 'pose38.jpeg',
    people: 2,
    moods: ['meme'],
    title: '질질 끌기',
    tip: '한 명은 바닥에 눕고, 다른 한 명이 발목 잡고 끌어가는 척하기',
  },
  {
    id: 'pose59',
    file: '0565ce9d0906e16d1eb1c3a39d7d875a.jpg',
    people: 2,
    moods: ['sweet', 'meme'],
    title: '손발 하트',
    tip: '나란히 서서 위에서는 손으로, 아래에서는 발로 하트 두 개 만들기',
  },
  {
    id: 'pose60',
    file: '0b9b84c38d317dad9f9f8b3fca20bf85.jpg',
    people: 2,
    moods: ['hip'],
    title: '손 내밀어 원근',
    tip: '둘 다 카메라 쪽으로 손을 크게 뻗고 얼굴은 손 사이로 빼꼼',
  },
  {
    id: 'pose61',
    file: '28579e447028db0d6e8d22332e504452.jpg',
    people: 2,
    moods: ['hip'],
    title: '벽에 발 기대기',
    tip: '벽에 등을 대고 한쪽 발바닥을 벽에 붙인 뒤 팔짱 끼기',
  },
  {
    id: 'pose62',
    file: '4f4d1fc8dd2c54bedf3cfcc170243ad3.jpg',
    people: 2,
    moods: ['sweet'],
    title: '몸으로 하트',
    tip: '마주 보고 손을 맞잡은 뒤 바깥 다리를 뻗어 둘이 하트 모양 만들기',
  },
  {
    id: 'pose63',
    file: '6dfc6a7e07ad5aa4ff920bcdbd3f782b.jpg',
    people: 2,
    moods: ['hip'],
    title: '손 프레임',
    tip: '각자 두 손으로 네모를 만들어 얼굴 앞에 겹쳐 대기',
  },
  {
    id: 'pose64',
    file: '7b7a23b74731167f5abb10d4f0b7889b.jpg',
    people: 2,
    moods: ['hip', 'meme'],
    title: '눈가 브이',
    tip: '다리를 넓게 벌려 서로 반대 방향을 보고 브이를 눈가에 대기',
  },
  {
    id: 'pose65',
    file: '8c8398dc8dc9c498780953dc91482586.jpg',
    people: 2,
    moods: ['meme', 'sweet'],
    title: '위아래 손 펼치기',
    tip: '앞뒤로 겹쳐 앉고 뒷사람은 손 활짝, 앞사람은 손으로 턱 받치기',
  },
  {
    id: 'pose66',
    file: 'GbCm7gja8AAsAX5.jpg',
    people: 2,
    moods: ['meme'],
    title: '합체 포즈',
    tip: '두 손을 가운데서 맞대고 팔은 위로 뻗어 기 모으는 척하기',
  },
  {
    id: 'pose67',
    file: 'images (4).jpeg',
    people: 2,
    moods: ['meme', 'hip'],
    title: '1대1 대치',
    tip: '무릎 굽혀 마주 보고 서로 막아서는 수비 자세 잡기',
  },
  {
    id: 'pose68',
    file: 'pG2ou6dA8ASqTeWLmp7WEvHXw_d8zYS6sjFKKZFQwcjHJAIVWurzuv4j9-tGV5CtURm8f3pUMQplxcFrriKGAQ.webp',
    people: 2,
    moods: ['meme'],
    title: '발레 듀엣',
    tip: '나란히 서서 손끝을 맞대고 진지한 표정으로 발레 자세',
  },
  {
    id: 'pose69',
    file: 'sddefault.jpg',
    people: 2,
    moods: ['meme'],
    title: '손가락 대결',
    tip: '마주 보고 검지를 맞댄 채 서로 밀어내는 표정 짓기',
  },

  // ── 3명 이상 ─────────────────────────────────────────
  {
    id: 'pose6',
    file: 'pose6.jpeg',
    people: 3,
    moods: ['hip', 'sweet'],
    title: '삼각 피라미드',
    tip: '가운데 한 명이 서고 양옆 두 명은 바닥에 앉아 다리 잡기',
  },
  {
    id: 'pose7',
    file: 'pose7.jpeg',
    people: 3,
    moods: ['meme', 'sweet'],
    title: '업어 업어',
    tip: '두 명이 각각 한 명씩 업고 가운데로 얼굴 모으기',
  },
  {
    id: 'pose8',
    file: 'pose8.jpeg',
    people: 3,
    moods: ['sweet', 'hip'],
    title: '다 함께 하트',
    tip: '각자 팔로 하트 반쪽씩 만들어 옆사람과 이어 붙이기',
  },
  {
    id: 'pose14',
    file: 'pose14.jpeg',
    people: 3,
    moods: ['meme'],
    title: '옛날 사진관',
    tip: '앞뒤로 어긋나게 서서 상체만 카메라 쪽으로 비틀기',
  },
  {
    id: 'pose33',
    file: 'pose33.jpeg',
    people: 3,
    moods: ['meme'],
    title: '가운데 몰아주기',
    tip: '양옆에서 가운데 사람 어깨를 잡고 가운데는 두 손 들기',
  },
  {
    id: 'pose37',
    file: 'pose37.jpeg',
    people: 3,
    moods: ['hip'],
    title: '3단 쌓기',
    tip: '아래부터 눕고 · 앉고 · 서서 맨 위 사람만 한 팔 높이 들기',
  },
  {
    id: 'pose39',
    file: '1592830621198.jpeg',
    people: 3,
    moods: ['meme', 'hip'],
    title: '전대물 합체',
    tip: '가운데는 두 손 활짝, 양옆은 다리 벌려 각자 다른 각도로 팔 뻗기',
  },
  {
    id: 'pose40',
    file: '20180228134033888_3RHF4ESP.jpg',
    people: 3,
    moods: ['meme'],
    title: '좀비 워크',
    tip: '다 같이 상체를 숙이고 팔은 앞으로 축 늘어뜨린 채 걸어가는 척',
  },
  {
    id: 'pose41',
    file: '20180228134045220_1JWOABX4.jpg',
    people: 3,
    moods: ['sweet', 'hip'],
    title: '손 모아 아치',
    tip: '가운데 한 명이 서고 나머지는 양옆에서 손끝을 맞대 아치 만들기',
  },
  {
    id: 'pose42',
    file: '20180228134056991_XHD2FTBX.jpg',
    people: 3,
    moods: ['meme'],
    title: '장풍 맞고 날아가기',
    tip: '가운데 한 명이 기를 모으면 나머지는 동시에 점프해서 날아가는 척',
  },
  {
    id: 'pose43',
    file: '202505121710265510_1.jpg',
    people: 3,
    moods: ['sweet', 'meme'],
    title: '다 함께 손 펼치기',
    tip: '앞줄은 손바닥 펴서 얼굴 옆, 뒷줄은 팔 크게 벌리고 다 같이 웃기',
  },
  {
    id: 'pose44',
    file: '2fb4cf13260ee6f6c578b0ceb64ec09e.jpg',
    people: 3,
    moods: ['sweet'],
    title: '세로 3단 볼 감싸기',
    tip: '앞뒤로 겹쳐 서서 각자 두 손으로 볼을 감싸고 고개 살짝 기울이기',
  },
  {
    id: 'pose45',
    file: '991c840375e291aee1cb953127e7ce51.jpg',
    people: 3,
    moods: ['hip'],
    title: '선글라스 내리기',
    tip: '위에서 찍고, 다 같이 선글라스를 살짝 내리며 렌즈 올려다보기',
  },
  {
    id: 'pose46',
    file: 'a6acb4a73eb115c44577e98c7406eddb.jpg',
    people: 3,
    moods: ['meme'],
    title: '인간 다리 놓기',
    tip: '두 명이 한 명을 수평으로 받치고 남은 한 명은 바닥에 누워 브이',
  },
  {
    id: 'pose47',
    file: 'a8ce879aaf4b5297ece69b175731beff.jpg',
    people: 3,
    moods: ['meme', 'hip'],
    title: '팔 얽기',
    tip: '앞줄은 앉고 뒷줄은 서서 옆사람과 팔을 X자로 교차해 걸기',
  },
  {
    id: 'pose48',
    file: 'b234166dab3192eb67eba6046aaf2183.jpg',
    people: 3,
    moods: ['sweet'],
    title: '브이 삼총사',
    tip: '가운데는 머리 위로 브이, 양옆은 얼굴 옆에 브이 붙이고 붙어 서기',
  },
  {
    id: 'pose49',
    file: 'c9643d975c109e1a715975f5cb2f5966.jpg',
    people: 3,
    moods: ['hip', 'sweet'],
    title: '계단식 팔 벌리기',
    tip: '앞에서 뒤로 앉은 높이를 다르게 두고 다 같이 팔을 활짝 펴기',
  },
  {
    id: 'pose50',
    file: 'ed39c016ee64146d06dbb02dc7c1d4c3.jpg',
    people: 3,
    moods: ['hip', 'meme'],
    title: '가운데만 주인공',
    tip: '가운데 한 명만 정면 무표정, 나머지는 뒤에서 얼굴만 빼꼼 내밀기',
  },
  {
    id: 'pose51',
    file: 'HGuUtNMagAAO0lp.jpg',
    people: 3,
    moods: ['meme', 'hip'],
    title: '천수관음',
    tip: '한 줄로 겹쳐 앉고 팔만 각자 다른 방향으로 뻗어 여러 개처럼 보이기',
  },
  {
    id: 'pose52',
    file: 'images (1).jpeg',
    people: 3,
    moods: ['hip'],
    title: '백뷰 룩북',
    tip: '다 같이 등지고 서서 고개만 카메라 쪽으로 돌리기',
  },
  {
    id: 'pose53',
    file: 'images (2).jpeg',
    people: 3,
    moods: ['hip'],
    title: '각자 다른 손동작',
    tip: '한 줄로 붙어 서서 각자 다른 손동작을 하나씩 잡기',
  },
  {
    id: 'pose54',
    file: 'images (3).jpeg',
    people: 3,
    moods: ['sweet', 'meme'],
    title: '무릎 짚고 웃기',
    tip: '다 같이 상체를 숙여 무릎에 손을 얹고 크게 웃기',
  },
  {
    id: 'pose55',
    file: 'images.jpeg',
    people: 3,
    moods: ['meme'],
    title: '일렬 천수관음',
    tip: '앞사람 다리 사이에 차례로 앉고 팔은 각자 다른 높이로 뻗기',
  },
  {
    id: 'pose56',
    file: 'PYH2026031116010001300_P4.jpg',
    people: 3,
    moods: ['sweet'],
    title: '다 같이 꽃받침',
    tip: '두 손을 턱 밑에 모아 받치고 어깨 붙여 나란히 서기',
  },
  {
    id: 'pose70',
    file: '16bcab9fca1632e201460bdc02c7e6fa.jpg',
    people: 3,
    moods: ['hip', 'meme'],
    title: '손가락 총 삼각',
    tip: '앞뒤로 어긋나게 서서 각자 다른 방향으로 손가락 총 겨누기',
  },
  {
    id: 'pose71',
    file: '2f60dbc6ccb752919761e3442729dc31.jpg',
    people: 3,
    moods: ['meme'],
    title: '각자 방어 자세',
    tip: '한 명은 막고, 한 명은 가리키고, 한 명은 손바닥 내밀기',
  },
  {
    id: 'pose72',
    file: '3e3c6a6ee185d8e226bfc8e3a7a8abfa.jpg',
    people: 3,
    moods: ['hip', 'meme'],
    title: '도미노 기대기',
    tip: '한 줄로 서서 다 같이 한쪽으로 기울고 바깥 팔은 위로 뻗기',
  },
  {
    id: 'pose73',
    file: '55ccc365493cf38e0e6ba941af249491.jpg',
    people: 3,
    moods: ['hip'],
    title: '팔 지그재그',
    tip: '다리 벌려 서서 팔을 위아래로 꺾어 지그재그 라인 만들기',
  },
  {
    id: 'pose74',
    file: '7b79c78c22ff0d903e584a87d1a57056.jpg',
    people: 3,
    moods: ['hip'],
    title: '엔젤 3인방',
    tip: '등을 맞대고 다리 벌려 선 뒤 두 손을 총 모양으로 세우기',
  },
  {
    id: 'pose75',
    file: 'a3c6e1134addd3f99f88ada2cc3763c8.jpg',
    people: 3,
    moods: ['meme'],
    title: '서로 지목하기',
    tip: '삼각형으로 서서 각자 옆사람을 손가락으로 가리키기',
  },
  {
    id: 'pose76',
    file: 'f1c9959cb730ffe6d4604dd3ae29337f.jpg',
    people: 3,
    moods: ['meme'],
    title: '보지도 듣지도 말하지도',
    tip: '앞뒤로 겹쳐 서서 각각 눈·입·귀를 손으로 가리기',
  },
  {
    id: 'pose77',
    file: 'f7196f4edaca33c02ba7bb7a3365a603.jpg',
    people: 3,
    moods: ['hip', 'sweet'],
    title: '3단 겹쳐 안기',
    tip: '앞사람은 한쪽 무릎 꿇고 뒤 두 명이 어깨 위로 팔을 겹쳐 모으기',
  },
];

/** id → Pose 조회용. 찜 목록을 복원할 때 쓴다. */
const POSE_BY_ID = new Map(POSES.map((pose) => [pose.id, pose]));

/**
 * @param {string} id
 * @returns {Pose | undefined}
 */
export function findPoseById(id) {
  return POSE_BY_ID.get(id);
}

/**
 * @param {Pose} pose
 * @returns {string} 이미지 경로
 */
export function poseImageSrc(pose) {
  // 파일명에 공백·괄호·한글이 있어도 안전하게 요청되도록 인코딩한다.
  // (예: 'images (1).jpeg' → 'images%20(1).jpeg')
  return `${IMAGE_DIR}/${encodeURIComponent(pose.file)}`;
}

/**
 * 인원 수 + 무드로 포즈를 고른다.
 * 정확히 맞는 포즈가 없으면 조건을 단계적으로 풀어 빈 화면을 만들지 않는다.
 *
 * @param {PeopleCount} people
 * @param {MoodId} mood
 * @returns {{ poses: Pose[], isExactMatch: boolean }}
 */
export function filterPoses(people, mood) {
  const exact = POSES.filter((pose) => pose.people === people && pose.moods.includes(mood));
  if (exact.length > 0) return { poses: exact, isExactMatch: true };

  const samePeople = POSES.filter((pose) => pose.people === people);
  if (samePeople.length > 0) return { poses: samePeople, isExactMatch: false };

  const sameMood = POSES.filter((pose) => pose.moods.includes(mood));
  if (sameMood.length > 0) return { poses: sameMood, isExactMatch: false };

  return { poses: [...POSES], isExactMatch: false };
}

/**
 * @param {PeopleCount} people
 * @returns {string} '2명' 처럼 화면에 그대로 쓰는 라벨
 */
export function peopleLabel(people) {
  return PEOPLE_OPTIONS.find((option) => option.value === people)?.label ?? `${people}명`;
}

/**
 * @param {MoodId} mood
 * @param {PeopleCount | null} people 같은 무드라도 인원 수에 따라 이름이 달라진다
 * @returns {string} '힙한' 처럼 화면에 그대로 쓰는 라벨
 */
export function moodLabel(mood, people) {
  return getMoodOptions(people).find((option) => option.id === mood)?.label ?? mood;
}
