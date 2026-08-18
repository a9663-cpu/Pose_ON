"""pose_images 의 사진들로 작은 썸네일을 만든다.

왜 필요한가
  첫 화면과 찜 목록에서는 사진을 작게(100~200px) 보여주는데, 원본은 평균 67KB,
  큰 건 450KB 나 된다. 그대로 쓰면 첫 화면에서만 수백 KB 를 받게 되고
  느린 모바일 회선에서 이탈이 늘어난다. 미리 줄여 두면 장당 5~10KB 로 끝난다.

쓰는 법 (사진을 추가하거나 교체한 뒤 한 번 실행)
    py scripts/make-thumbs.py

  - pose_images/thumbs/ 에 <원본파일명>.webp 로 저장한다.
  - 이미 있고 원본보다 최신이면 건너뛴다.
  - 썸네일이 없어도 앱은 원본으로 자동 대체되므로 실행을 잊어도 깨지지 않는다.
"""

import sys
from pathlib import Path

from PIL import Image

THUMB_WIDTH = 240  # 화면에는 120px 안팎으로 보이므로 2배로 준비한다
QUALITY = 72

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def main() -> int:
    source_dir = Path(__file__).resolve().parent.parent / "pose_images"
    thumb_dir = source_dir / "thumbs"

    if not source_dir.is_dir():
        print(f"pose_images 폴더를 찾지 못했습니다: {source_dir}")
        return 1

    thumb_dir.mkdir(exist_ok=True)

    made = skipped = failed = 0
    total_bytes = 0

    for source in sorted(source_dir.iterdir()):
        if not source.is_file() or source.suffix.lower() not in IMAGE_SUFFIXES:
            continue

        target = thumb_dir / f"{source.name}.webp"
        if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
            skipped += 1
            total_bytes += target.stat().st_size
            continue

        try:
            with Image.open(source) as image:
                image = image.convert("RGB")
                ratio = THUMB_WIDTH / image.width
                size = (THUMB_WIDTH, max(1, round(image.height * ratio)))
                image.resize(size, Image.LANCZOS).save(target, "WEBP", quality=QUALITY)
            made += 1
            total_bytes += target.stat().st_size
        except Exception as error:  # noqa: BLE001 - 한 장 실패가 전체를 막지 않게 한다
            print(f"  실패: {source.name} ({error})")
            failed += 1

    print(f"생성 {made}장 / 건너뜀 {skipped}장 / 실패 {failed}장")
    print(f"썸네일 총 용량 {total_bytes / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
