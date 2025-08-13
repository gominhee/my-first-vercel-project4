// 캔버스 슈팅게임 - 바닐라 JS
(() => {
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById('gameCanvas');
  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;

  // 시스템 값
  const state = {
    running: false,
    lastTime: 0,
    elapsed: 0,
    score: 0,
    lives: 3,
    combo: 0,
  };

  // 유틸리티
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => Math.random() * (max - min) + min;

  // 입력
  const input = {
    left: false,
    right: false,
    shoot: false,
    pointerDown: false,
    pointerX: W / 2,
  };

  // 엔티티
  class Player {
    constructor() {
      this.width = 42;
      this.height = 42;
      this.x = (W - this.width) / 2;
      this.y = H - this.height - 26;
      this.speed = 360;
      this.cooldown = 0;
    }
    update(dt) {
      let axis = 0;
      if (input.left) axis -= 1;
      if (input.right) axis += 1;
      this.x += axis * this.speed * dt;

      // 포인터 드래그/터치 이동
      if (input.pointerDown) {
        this.x += (input.pointerX - (this.x + this.width / 2)) * 0.25;
      }

      this.x = clamp(this.x, 8, W - this.width - 8);
      if (this.cooldown > 0) this.cooldown -= dt;
      if ((input.shoot || input.pointerDown) && this.cooldown <= 0) {
        bullets.push(new Bullet(this.x + this.width / 2, this.y));
        this.cooldown = 0.18; // 연사 간격
      }
    }
    draw() {
      // 본체
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      // 외곽 글로우
      ctx.shadowColor = 'rgba(125,200,255,0.6)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#7bd0ff';
      roundedRect(-18, -18, 36, 36, 8, true);
      // 코어
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#102850';
      roundedRect(-12, -12, 24, 24, 6, true);
      ctx.restore();
    }
  }

  class Bullet {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 4;
      this.speed = 640;
      this.dead = false;
    }
    update(dt) {
      this.y -= this.speed * dt;
      if (this.y < -10) this.dead = true;
    }
    draw() {
      ctx.save();
      ctx.fillStyle = '#7bff9f';
      ctx.shadowColor = 'rgba(123,255,159,.6)';
      ctx.shadowBlur = 10;
      circle(this.x, this.y, this.radius, true);
      ctx.restore();
    }
  }

  class Enemy {
    constructor(x, speed, hp, score) {
      this.width = 36;
      this.height = 28;
      this.x = x;
      this.y = -this.height;
      this.speed = speed;
      this.hp = hp;
      this.score = score;
      this.dead = false;
      this.flash = 0;
    }
    update(dt) {
      this.y += this.speed * dt;
      if (this.y > H + 40) this.dead = true;
      if (this.flash > 0) this.flash -= dt;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.shadowColor = 'rgba(255,93,125,.6)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = this.flash > 0 ? '#ffd2dc' : '#ff5d7d';
      roundedRect(-18, -12, 36, 24, 6, true);
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, color) {
      this.x = x; this.y = y;
      this.vx = rand(-180, 180);
      this.vy = rand(-220, 40);
      this.life = rand(0.4, 0.9);
      this.radius = rand(1, 3.2);
      this.color = color;
      this.dead = false;
    }
    update(dt) {
      this.life -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 520 * dt * 0.6; // 중력
      if (this.life <= 0) this.dead = true;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(this.life, 0);
      ctx.fillStyle = this.color;
      circle(this.x, this.y, this.radius, true);
      ctx.restore();
    }
  }

  // 전역 엔티티 컨테이너
  const player = new Player();
  /** @type {Bullet[]} */
  const bullets = [];
  /** @type {Enemy[]} */
  const enemies = [];
  /** @type {Particle[]} */
  const particles = [];

  // 스폰/난이도
  let spawnTimer = 0;
  let difficulty = 1;

  // HUD DOM
  const hud = createHud();

  function createHud(){
    const el = document.createElement('div');
    el.className = 'hud';
    el.innerHTML = `
      <div class="badge accent" id="hudScore">점수 0</div>
      <div class="badge good" id="hudCombo">콤보 x0</div>
      <div class="badge danger" id="hudLives">목숨 3</div>
    `;
    document.getElementById('game-container').appendChild(el);
    return el;
  }

  const banner = document.createElement('div');
  banner.className = 'center-banner';
  banner.textContent = 'Enter 키로 시작';
  document.getElementById('game-container').appendChild(banner);

  // 도형 헬퍼
  function roundedRect(x, y, w, h, r, fill){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    if (fill) ctx.fill(); else ctx.stroke();
  }
  function circle(x, y, r, fill){
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) ctx.fill(); else ctx.stroke();
  }

  // 게임 루프
  function loop(ts){
    if (!state.lastTime) state.lastTime = ts;
    const dt = Math.min(0.033, (ts - state.lastTime) / 1000);
    state.lastTime = ts;

    if (state.running) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt){
    // 난이도 스케일
    difficulty += dt * 0.02;
    spawnTimer -= dt;
    if (spawnTimer <= 0){
      spawnEnemy();
      spawnTimer = Math.max(0.25, 1.2 - difficulty * 0.08);
    }

    player.update(dt);
    bullets.forEach(b => b.update(dt));
    enemies.forEach(e => e.update(dt));
    particles.forEach(p => p.update(dt));

    // 충돌 체크
    for (let i = 0; i < enemies.length; i++){
      const e = enemies[i];
      // 플레이어 충돌
      if (aabb(e, player)) {
        damagePlayer(e);
        continue;
      }

      for (let j = 0; j < bullets.length; j++){
        const b = bullets[j];
        if (b.dead || e.dead) continue;
        if (rectCircleCollide(e, b)){
          b.dead = true;
          e.hp -= 1;
          e.flash = 0.08;
          if (e.hp <= 0){
            killEnemy(i);
          }
        }
      }
    }

    // 제거
    removeDead(bullets);
    removeDead(enemies);
    removeDead(particles);
  }

  function render(){
    // 배경
    ctx.clearRect(0, 0, W, H);
    drawStars();

    // 엔티티
    player.draw();
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    particles.forEach(p => p.draw());

    // HUD 업데이트
    document.getElementById('hudScore').textContent = `점수 ${state.score}`;
    document.getElementById('hudCombo').textContent = `콤보 x${state.combo}`;
    document.getElementById('hudLives').textContent = `목숨 ${state.lives}`;
  }

  // 배경 별장식
  const starsFar = Array.from({length: 80}, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.4, 1.2), s: rand(10, 30) }));
  const starsNear = Array.from({length: 35}, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.8, 2.0), s: rand(40, 80) }));
  function drawStars(){
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    starsFar.forEach(st => {
      st.y += st.s * 0.016;
      if (st.y > H) st.y = 0, st.x = rand(0, W);
      circle(st.x, st.y, st.r, true);
    });
    ctx.globalAlpha = .9;
    ctx.fillStyle = 'rgba(160,200,255,.9)';
    starsNear.forEach(st => {
      st.y += st.s * 0.016;
      if (st.y > H) st.y = 0, st.x = rand(0, W);
      circle(st.x, st.y, st.r, true);
    });
    ctx.restore();
  }

  // 스폰/처리
  function spawnEnemy(){
    const x = rand(16, W - 52);
    const speed = rand(80, 140) + difficulty * 12;
    const tough = Math.random() < Math.min(0.35, 0.1 + difficulty * 0.03);
    const hp = tough ? 3 : 1;
    const score = tough ? 30 : 10;
    enemies.push(new Enemy(x, speed, hp, score));
  }

  function killEnemy(index){
    const e = enemies[index];
    if (!e) return;
    e.dead = true;
    state.combo = Math.min(state.combo + 1, 99);
    const bonus = Math.floor(state.combo * 1.5);
    state.score += e.score + bonus;
    spawnExplosion(e.x + e.width/2, e.y + e.height/2, '#ff5d7d');
  }

  function damagePlayer(e){
    e.dead = true;
    spawnExplosion(e.x + e.width/2, e.y + e.height/2, '#ffd2dc');
    state.lives -= 1;
    state.combo = 0;
    if (state.lives <= 0){
      gameOver();
    }
  }

  function spawnExplosion(x, y, color){
    const count = 24;
    for (let i = 0; i < count; i++){
      particles.push(new Particle(x, y, color));
    }
  }

  function aabb(a, b){
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }
  function rectCircleCollide(rect, c){
    const cx = clamp(c.x, rect.x, rect.x + rect.width);
    const cy = clamp(c.y, rect.y, rect.y + rect.height);
    const dx = c.x - cx;
    const dy = c.y - cy;
    return dx*dx + dy*dy <= c.radius * c.radius;
  }
  function removeDead(arr){
    for (let i = arr.length - 1; i >= 0; i--){
      if (arr[i].dead) arr.splice(i, 1);
    }
  }

  function reset(){
    state.running = false;
    state.lastTime = 0;
    state.elapsed = 0;
    state.score = 0;
    state.lives = 3;
    state.combo = 0;
    bullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    spawnTimer = 0;
    difficulty = 1;
    banner.textContent = 'Enter 키로 시작';
  }

  function start(){
    if (state.running) return;
    state.running = true;
    banner.textContent = '';
  }

  function gameOver(){
    state.running = false;
    banner.textContent = `게임 오버\n점수 ${state.score} - Enter 키로 재시작`;
  }

  // 입력 처리
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
    if (e.code === 'Space') input.shoot = true;
    if (e.code === 'Enter') {
      if (!state.running && state.lives <= 0) reset();
      if (!state.running) start();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
    if (e.code === 'Space') input.shoot = false;
  });

  // 포인터(마우스/터치)
  const container = document.getElementById('game-container');
  const toCanvasX = (clientX) => {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (W / rect.width);
    return clamp(x, 0, W);
  };
  const onDown = (x) => {
    input.pointerDown = true; input.pointerX = toCanvasX(x);
    if (!state.running) start();
  };
  const onUp = () => { input.pointerDown = false; };
  const onMove = (x) => { input.pointerX = toCanvasX(x); };

  container.addEventListener('mousedown', (e)=> onDown(e.clientX));
  window.addEventListener('mouseup', onUp);
  window.addEventListener('mousemove', (e)=> onMove(e.clientX));

  container.addEventListener('touchstart', (e)=> { onDown(e.touches[0].clientX); e.preventDefault(); }, {passive:false});
  window.addEventListener('touchend', (e)=> { onUp(); e.preventDefault(); }, {passive:false});
  window.addEventListener('touchmove', (e)=> { onMove(e.touches[0].clientX); e.preventDefault(); }, {passive:false});

  // 시작
  reset();
  requestAnimationFrame(loop);
})();

