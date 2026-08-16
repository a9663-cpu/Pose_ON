/**
 * 아주 작은 스프링 물리 시뮬레이터.
 * CSS easing 대신 이걸 쓰는 이유: 손을 뗀 순간의 "속도"를 그대로 이어받아야
 * 카드가 진짜 물체처럼 튕겨 돌아온다.
 */

/**
 * @param {object} options
 * @param {number} options.from            시작 위치
 * @param {number} [options.to]            도착 위치 (기본 0)
 * @param {number} [options.velocity]      초기 속도 (px/s)
 * @param {number} [options.stiffness]     탄성 계수 (클수록 빠르게 당겨짐)
 * @param {number} [options.damping]       감쇠 계수 (클수록 덜 출렁임)
 * @param {number} [options.precision]     이 값보다 가까워지면 정지
 * @param {(value: number) => void} options.onFrame
 * @param {() => void} [options.onRest]
 * @returns {() => void} 애니메이션을 즉시 중단하는 함수
 */
export function runSpring({
  from,
  to = 0,
  velocity = 0,
  stiffness = 220,
  damping = 26,
  precision = 0.35,
  onFrame,
  onRest,
}) {
  let position = from;
  let speed = velocity;
  let lastTime = performance.now();
  let frameId = 0;
  let isCancelled = false;

  const step = (now) => {
    if (isCancelled) return;

    // 탭 전환 등으로 프레임이 크게 밀려도 시뮬레이션이 터지지 않도록 상한을 둔다.
    const deltaSeconds = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    const springForce = -stiffness * (position - to);
    const dampingForce = -damping * speed;
    speed += (springForce + dampingForce) * deltaSeconds;
    position += speed * deltaSeconds;

    if (Math.abs(position - to) < precision && Math.abs(speed) < precision * 10) {
      onFrame(to);
      onRest?.();
      return;
    }

    onFrame(position);
    frameId = requestAnimationFrame(step);
  };

  frameId = requestAnimationFrame(step);

  return () => {
    isCancelled = true;
    cancelAnimationFrame(frameId);
  };
}
