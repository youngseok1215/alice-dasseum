const DSW = window.WantedDesignSystem_39e8bd;
const { ButtonButton, ToastToast, CircularCircular, Icon } = DSW;

const DC = { bg: '#F7FAF8', cream: '#F2EDE5', card: '#D9EFE9', mint: '#7ED8C8', point: '#3EB6A6', ink: 'var(--label-normal)', neutral: 'var(--label-neutral)', alt: 'var(--label-alternative)', assist: 'var(--label-assistive)', line: 'var(--line-normal-alternative)', hair: 'inset 0 0 0 1px var(--line-normal-alternative)' };
const tx = (s, lh, w, c) => ({ fontSize: s, lineHeight: lh + 'px', fontWeight: w, color: c || DC.ink, letterSpacing: s >= 20 ? '-0.012em' : s <= 13 ? '0.02em' : '0.006em', margin: 0 });
const MASCOT = { smile: 'assets/mascot/dasseum-mascot-smile.png', search: 'assets/mascot/dasseum-mascot-search.png', done: 'assets/mascot/dasseum-mascot-done.png', hold: 'assets/mascot/dasseum-mascot-hold.png' };

const PRODUCTS = {
  vitd: { id: 'vitd', name: '온데이 비타민D3 1000IU 90정', brand: '온데이', cat: '영양제', opened: '2026.09.03', expires: '2027.06.30', dday: 230, registered: '2026.09.03', memo: '주방 선반 보관' },
  toner: { id: 'toner', name: '약산성 진정 토너 300ml', brand: '라온스킨', cat: '화장품', opened: '2026.05.02', expires: '2026.11.19', dday: 7, registered: '2026.05.02', reason: '사용기한 D-7' },
  multi: { id: 'multi', name: '멀티비타민 60정', brand: '하루웰', cat: '영양제', opened: '2026.08.01', expires: '2026.12.05', dday: 23, registered: '2026.07.28', reason: '사용기한 D-23' },
  sun: { id: 'sun', name: '데일리 선크림 SPF50+ 50ml', brand: '선데이즈', cat: '화장품', opened: '2026.09.10', expires: '2027.03.10', dday: 118, registered: '2026.09.10', reason: '개봉 2개월째' },
  eye: { id: 'eye', name: '인공눈물 일회용 30개입', brand: '맑은눈', cat: '의약품', opened: null, expires: '2026.11.10', dday: -2, registered: '2026.06.14' },
  shampoo: { id: 'shampoo', name: '퍼퓸 샴푸 1L', brand: '배스데이', cat: '생활용품', opened: '2026.10.20', expires: null, dday: null, registered: '2026.10.20' },
};

function matchQuery(q, mode) {
  if (mode === 'photo') return { verdict: 'same', items: ['vitd'] };
  const s = (q || '').toLowerCase().replace(/\s/g, '');
  if (/2000/.test(s) && /비타민d|vitamind/.test(s)) return { verdict: 'similar', items: ['vitd'] };
  if (/비타민d|vitamind|비타민디/.test(s)) return { verdict: 'same', items: ['vitd'] };
  return { verdict: 'none', items: [] };
}

function DBadge({ tone, children }) {
  const m = { warn: ['#FFF1E0', '#8F4500'], neg: ['#FFE8E8', '#B71C1C'], ok: ['#E3F7EA', '#0B6E30'], mint: [DC.card, '#171719'], neutral: ['var(--fill-normal)', 'var(--label-neutral)'] }[tone];
  return <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 7px', borderRadius: 6, background: m[0], color: m[1], fontSize: 12, fontWeight: 600, lineHeight: '16px', whiteSpace: 'nowrap' }}>{children}</span>;
}
function ddayBadge(d) {
  if (d === null || d === undefined) return <DBadge tone="neutral">기한 미입력</DBadge>;
  if (d < 0) return <DBadge tone="neg">기한 지남</DBadge>;
  if (d === 0) return <DBadge tone="neg">오늘까지</DBadge>;
  if (d <= 30) return <DBadge tone="warn">D-{d}</DBadge>;
  return <DBadge tone="neutral">D-{d}</DBadge>;
}

function DButton({ label, onClick, variant = 'solid', icon, disabled, size = 'lg' }) {
  const solid = variant === 'solid';
  const ic = icon ? <Icon name={icon} size={20} /> : undefined;
  return (
    <button className="dsm-press" onClick={disabled ? undefined : onClick} aria-disabled={disabled} style={{ all: 'unset', display: 'block', width: '100%', position: 'relative', cursor: disabled ? 'default' : 'pointer', borderRadius: 12, '--static-white-3': '#171719' }}>
      <ButtonButton size={size} variant={solid ? 'solid' : 'outlined'} color={solid ? 'primary' : 'assistive'} label={label} disable={!!disabled} leadingIcon={!!icon} icon1={ic} icon2={ic} style={{ width: '100%' }} />
    </button>
  );
}
function TextBtn({ children, onClick, color }) {
  return <button className="dsm-press" onClick={onClick} style={{ all: 'unset', cursor: 'pointer', position: 'relative', borderRadius: 8, padding: '8px 4px', ...tx(14, 20, 600, color || DC.neutral) }}>{children}</button>;
}
function IconBtn({ name, onClick, label, color, dot }) {
  return (
    <button className="dsm-press" onClick={onClick} aria-label={label} style={{ all: 'unset', cursor: 'pointer', position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, color: color || DC.ink }}>
      <Icon name={name} size={24} />
      {dot && <span style={{ position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: 3, background: 'var(--status-negative)' }}></span>}
    </button>
  );
}
function TopBar({ title, onBack, right }) {
  return (
    <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
      {onBack ? <IconBtn name="chevronLeft" label="뒤로가기" onClick={onBack} /> : <div style={{ width: 12 }}></div>}
      <div style={{ flex: 1, ...tx(18, 26, 600) }}>{title}</div>
      {right}
    </div>
  );
}
function ProdImg({ size = 56, radius = 12 }) {
  return <div style={{ width: size, height: size, borderRadius: radius, background: DC.cream, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: DC.hair, color: 'rgba(55,56,60,.45)' }}><Icon name="image" size={Math.max(16, Math.round(size / 3))} /></div>;
}
function Mascot({ kind, size }) {
  return <img src={MASCOT[kind]} alt="" style={{ width: size, height: size, objectFit: 'contain', mixBlendMode: 'multiply', display: 'block', flexShrink: 0 }} />;
}
function Card({ children, style, onClick, tone }) {
  return <div className={onClick ? 'dsm-press' : ''} onClick={onClick} style={{ position: 'relative', background: tone === 'mint' ? DC.card : tone === 'cream' ? DC.cream : '#fff', borderRadius: 16, boxShadow: tone ? 'none' : DC.hair, cursor: onClick ? 'pointer' : 'default', ...style }}>{children}</div>;
}
function SectionHead({ title, action, onAction }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 8 }}><h3 style={tx(17, 24, 700)}>{title}</h3>{action && <TextBtn onClick={onAction}>{action}</TextBtn>}</div>;
}
function ActionArea({ children }) {
  return <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 20px 8px', background: DC.bg }}>{children}</div>;
}

function BottomNav({ active, onTab }) {
  const items = [['home', 'home', '홈'], ['check', 'search', '구매 전 확인'], ['items', 'storage', '내 물품'], ['settings', 'setting', '설정']];
  return (
    <nav style={{ flexShrink: 0, display: 'flex', background: '#fff', boxShadow: 'inset 0 1px 0 var(--line-normal-alternative)', padding: '6px 0 0' }}>
      {items.map(([k, ic, l]) => (
        <button key={k} onClick={() => onTab(k)} style={{ all: 'unset', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0', color: active === k ? DC.ink : 'rgba(55,56,60,.45)' }}>
          <Icon name={active === k && ic !== 'search' && ic !== 'storage' ? ic + 'Fill' : ic} size={24} />
          <span style={{ fontSize: 11, lineHeight: '14px', fontWeight: 600, letterSpacing: '0.03em' }}>{l}</span>
        </button>
      ))}
    </nav>
  );
}

/* 1. 홈 */
function HomeScreen({ go, toast, holds, dones = 3 }) {
  const firsts = ['toner', 'multi', 'sun'].map(k => PRODUCTS[k]);
  const urgent = ['eye', 'toner'].map(k => PRODUCTS[k]);
  return (
    <div style={{ paddingBottom: 28 }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 8px 0 20px' }}>
        <span style={{ fontFamily: 'var(--font-brand, inherit)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', flex: 1 }}>다씀</span>
        <IconBtn name="bell" label="사용기한 알림" dot onClick={() => toast('사용기한 알림은 이번 테스트 범위가 아니에요')} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 20px 20px' }}>
        <div style={{ flex: 1 }}>
          <h1 style={tx(22, 30, 700)}>확인이 필요한 제품이<br />2개 있어요</h1>
          <p style={{ ...tx(14, 20, 500, DC.alt), marginTop: 6 }}>있는 걸 먼저, 끝까지 다 쓰는 습관</p>
        </div>
        <Mascot kind="smile" size={140} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px 28px' }}>
        <Card onClick={() => go('camera', { purpose: 'register' })} style={{ padding: 16, minHeight: 112, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Icon name="camera" size={24} />
          <div><div style={tx(16, 24, 700)}>제품 등록</div><div style={tx(13, 18, 500, DC.alt)}>찍어서 내 물품에 추가</div></div>
        </Card>
        <Card tone="mint" onClick={() => go('check')} style={{ padding: 16, minHeight: 112, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Icon name="search" size={24} />
          <div><div style={tx(16, 24, 700)}>구매 전 확인</div><div style={tx(13, 18, 500, DC.neutral)}>사기 전에 먼저 확인해요</div></div>
        </Card>
      </div>
      <SectionHead title="먼저 써야 할 제품" action="전체보기" onAction={() => go('first')} />
      <div className="dsm-noscroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 20px 28px' }}>
        {firsts.map(p => (
          <Card key={p.id} onClick={() => go('detail', { id: p.id })} style={{ width: 148, flexShrink: 0, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ProdImg size={124} />
            <div>
              <div style={{ ...tx(14, 20, 600), display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}>{p.name}</div>
              <div style={{ marginTop: 6 }}><DBadge tone="mint">{p.reason}</DBadge></div>
            </div>
          </Card>
        ))}
      </div>
      <SectionHead title="사용기한 임박" />
      <div style={{ padding: '0 20px 28px' }}>
        <Card style={{ padding: '4px 0' }}>
          {urgent.map((p, i) => (
            <div key={p.id} className="dsm-press" onClick={() => go('detail', { id: p.id })} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', boxShadow: i ? 'inset 0 1px 0 var(--line-normal-alternative)' : 'none' }}>
              <ProdImg size={44} radius={10} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ ...tx(15, 22, 600), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div><div style={tx(13, 18, 500, DC.alt)}>{p.cat} · {p.opened ? '개봉' : '미개봉'}</div></div>
              {ddayBadge(p.dday)}
            </div>
          ))}
        </Card>
      </div>
      <div style={{ padding: '0 20px' }}>
        <Card tone="cream" onClick={() => go('record', { tab: 'hold' })} style={{ padding: '16px 16px 16px 20px', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={tx(13, 18, 600, DC.neutral)}>이번 달 소비 관리</div>
            <div style={{ ...tx(17, 26, 700), marginTop: 2 }}>다씀 {dones}개 · 구매 보류 {holds}회</div>
          </div>
          <Icon name="chevronRight" size={20} style={{ color: DC.alt }} />
        </Card>
      </div>
    </div>
  );
}

/* 2. 구매 전 확인 */
function CheckScreen({ go, query, setQuery, recents, setRecents }) {
  const ref = React.useRef(null);
  const [focus, setFocus] = React.useState(false);
  const submit = (q) => { const v = (q ?? query).trim(); if (!v) return; setQuery(v); go('analyzing', { mode: 'search', query: v }); };
  return (
    <div style={{ paddingBottom: 28 }}>
      <div style={{ padding: '16px 20px 0' }}>
        <h1 style={tx(24, 32, 700)}>구매 전 확인</h1>
        <p style={{ ...tx(15, 22, 500, DC.alt), marginTop: 4 }}>사기 전에 내 물품에 있는지 확인해요</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}></div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 8px 0 14px', borderRadius: 12, background: '#fff', boxShadow: focus ? 'inset 0 0 0 2px #3EB6A6, 0 1px 2px rgba(0,0,0,.03)' : 'inset 0 0 0 1px var(--line-normal-neutral), 0 1px 2px rgba(0,0,0,.03)' }} onClick={() => ref.current && ref.current.focus()}>
          <Icon name="search" size={20} style={{ color: DC.alt, flexShrink: 0 }} />
          <input ref={ref} value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder="제품명이나 브랜드를 입력하세요" enterKeyHint="search" style={{ all: 'unset', flex: 1, minWidth: 0, ...tx(16, 24, 500) }} />
          {query && <button type="button" aria-label="지우기" onClick={e => { e.stopPropagation(); setQuery(''); }} style={{ all: 'unset', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DC.assist }}><Icon name="circleCloseFill" size={20} /></button>}
        </form>
        <DButton label="확인하기" disabled={!query.trim()} onClick={() => submit()} />
        <DButton label="사진으로 확인하기" variant="outlined" icon="camera" onClick={() => go('camera')} />
      </div>
      <div style={{ padding: '32px 20px 0' }}>
        <h3 style={{ ...tx(17, 24, 700), marginBottom: 4 }}>최근 확인</h3>
        {recents.length === 0 && <p style={{ ...tx(14, 20, 500, DC.alt), padding: '12px 0' }}>최근 확인한 제품이 없어요</p>}
        {recents.map((r, i) => (
          <div key={r.q} style={{ display: 'flex', alignItems: 'center', gap: 10, boxShadow: i ? 'inset 0 1px 0 var(--line-normal-alternative)' : 'none' }}>
            <button className="dsm-press" onClick={() => submit(r.q)} style={{ all: 'unset', cursor: 'pointer', position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
              <Icon name="history" size={20} style={{ color: DC.alt }} />
              <span style={{ flex: 1, ...tx(15, 22, 500) }}>{r.q}</span>
              <span style={tx(13, 18, 500, DC.alt)}>{r.date}</span>
            </button>
            <IconBtn name="close" label={r.q + ' 삭제'} color={DC.alt} onClick={() => setRecents(recents.filter(x => x.q !== r.q))} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* 3. 사진으로 확인 */
function CameraScreen({ params, go, back, toast }) {
  const reg = params && params.purpose === 'register';
  const shoot = () => { if (reg) { back(); toast('촬영 후 정보 확인 화면은 이번 테스트 범위가 아니에요'); } else go('analyzing', { mode: 'photo', query: '촬영한 사진' }); };
  const corner = (pos) => ({ position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderStyle: 'solid', borderWidth: 0, ...pos });
  return (
    <div style={{ height: '100%', background: '#1B1C1E', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
        <IconBtn name="close" label="닫기" color="#fff" onClick={back} />
        <div style={{ flex: 1, textAlign: 'center', ...tx(17, 24, 600, '#fff') }}>{reg ? '제품 등록' : '사진으로 확인'}</div>
        <div style={{ width: 44 }}></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ position: 'relative', width: 248, height: 300 }}>
          <div style={corner({ left: 0, top: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 })}></div>
          <div style={corner({ right: 0, top: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 })}></div>
          <div style={corner({ left: 0, bottom: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 })}></div>
          <div style={corner({ right: 0, bottom: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 })}></div>
          <div style={{ position: 'absolute', inset: 36, borderRadius: 14, background: 'rgba(255,255,255,.08)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,.7)' }}>
            <Icon name="image" size={28} />
            <span style={tx(13, 18, 500, 'rgba(255,255,255,.8)')}>카메라 미리보기</span>
          </div>
        </div>
        <p style={tx(15, 22, 500, '#fff')}>제품 이름이 잘 보이게 찍어주세요</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 36px 28px' }}>
        <button onClick={shoot} aria-label="앨범에서 선택" style={{ all: 'unset', cursor: 'pointer', width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="image" size={24} /></button>
        <button onClick={shoot} aria-label="촬영" style={{ all: 'unset', cursor: 'pointer', width: 72, height: 72, borderRadius: 36, background: '#fff', boxShadow: '0 0 0 4px #1B1C1E, 0 0 0 6px rgba(255,255,255,.6)' }}></button>
        <div style={{ width: 48 }}></div>
      </div>
    </div>
  );
}

/* 4. AI 확인 중 */
function AnalyzingScreen({ params, go, back }) {
  React.useEffect(() => { const t = setTimeout(() => go('result', params, true), 1700); return () => clearTimeout(t); }, []);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 32px', textAlign: 'center' }}>
        <Mascot kind="search" size={160} />
        <div>
          <h2 style={tx(20, 28, 700)}>내 물품과 비교하고 있어요</h2>
          <p style={{ ...tx(15, 22, 500, DC.alt), marginTop: 6 }}>{params.mode === 'photo' ? '촬영한 사진' : `‘${params.query}’`}과 같거나 비슷한 제품을 찾는 중이에요</p>
        </div>
      </div>
      <ActionArea><DButton label="취소" variant="outlined" onClick={back} /></ActionArea>
    </div>
  );
}

/* 5. AI 확인 결과 */
function ResultScreen({ params, go, back, onHold, onContinue, toast }) {
  const r = matchQuery(params.query, params.mode);
  const V = {
    same: { badge: <DBadge tone="warn">동일 제품 있음</DBadge>, title: '이미 가지고 있어요', sub: '내 물품에 같은 제품이 1개 있어요.' },
    similar: { badge: <DBadge tone="mint">유사 제품 있음</DBadge>, title: '비슷한 제품이 있어요', sub: '같은 브랜드의 다른 용량 제품이에요.' },
    none: { badge: <DBadge tone="ok">보유 제품 없음</DBadge>, title: '가지고 있는 제품이 없어요', sub: `내 물품에서 ‘${params.query}’과 같거나 비슷한 제품을 찾지 못했어요.` },
  }[r.verdict];
  const isSupp = r.items.some(k => ['영양제', '의약품'].includes(PRODUCTS[k].cat));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar title="확인 결과" onBack={back} />
      <div className="dsm-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--fill-alternative, rgba(112,115,124,.05))', marginBottom: 20 }}>
          <Icon name={params.mode === 'photo' ? 'camera' : 'search'} size={18} style={{ color: DC.alt }} />
          <span style={tx(14, 20, 500, DC.neutral)}>{params.mode === 'photo' ? '촬영한 사진으로 확인했어요' : `‘${params.query}’ 확인 결과`}</span>
        </div>
        {V.badge}
        <h1 style={{ ...tx(24, 32, 700), marginTop: 10 }}>{V.title}</h1>
        <p style={{ ...tx(15, 22, 500, DC.alt), marginTop: 4 }}>{V.sub}</p>
        {r.items.map(k => { const p = PRODUCTS[k]; return (
          <Card key={k} style={{ marginTop: 20, padding: 16 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <ProdImg size={72} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={tx(13, 18, 500, DC.alt)}>{p.brand} · {p.cat}</div>
                <div style={{ ...tx(16, 24, 600), marginTop: 2 }}>{p.name}</div>
                {r.verdict === 'similar' && <div style={{ ...tx(13, 18, 500, DC.neutral), marginTop: 4 }}>확인한 제품과 용량이 달라요 (1000IU · 2000IU)</div>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', marginTop: 14, paddingTop: 14, boxShadow: 'inset 0 1px 0 var(--line-normal-alternative)' }}>
              <span style={tx(14, 20, 500, DC.alt)}>개봉일</span><span style={tx(14, 20, 600)}>{p.opened ? `${p.opened} 개봉` : '미개봉'}</span>
              <span style={tx(14, 20, 500, DC.alt)}>사용기한</span><span style={{ display: 'flex', alignItems: 'center', gap: 6, ...tx(14, 20, 600) }}>{p.expires} {ddayBadge(p.dday)}</span>
            </div>
            <div style={{ marginTop: 14 }}><DButton size="md" variant="outlined" label="보유 제품 상세 보기" onClick={() => go('detail', { id: k })} /></div>
          </Card>
        ); })}
        <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 12, background: DC.cream, display: 'flex', gap: 8 }}>
          <Icon name="circleInfo" size={18} style={{ color: DC.neutral, flexShrink: 0, marginTop: 1 }} />
          <div style={tx(13, 19, 500, DC.neutral)}>AI 확인 결과는 참고용이에요. 실제 제품을 확인해 주세요.{isSupp && <><br />영양제·의약품의 효능이나 대체 가능 여부는 안내하지 않아요.</>}</div>
        </div>
      </div>
      <ActionArea>
        {r.verdict === 'none' ? <>
          <DButton label="확인 완료" onClick={onContinue} />
          <DButton label="다시 확인하기" variant="outlined" onClick={() => go('check', null, false, true)} />
        </> : <>
          <DButton label="구매 보류" onClick={() => onHold(params, r)} />
          <DButton label="그래도 구매할게요" variant="outlined" onClick={onContinue} />
        </>}
      </ActionArea>
    </div>
  );
}

/* 6. 보유 제품 상세 */
function DetailScreen({ params, back, toast, onDone }) {
  const p = PRODUCTS[params.id];
  const [opened, setOpened] = React.useState(p.opened);
  const row = (k, v) => <div style={{ display: 'flex', alignItems: 'center', minHeight: 52, boxShadow: 'inset 0 -1px 0 var(--line-normal-alternative)' }}><span style={{ width: 88, ...tx(15, 22, 500, DC.alt) }}>{k}</span><div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, ...tx(15, 22, 600) }}>{v}</div></div>;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar title="" onBack={back} right={<IconBtn name="moreVertical" label="더보기" onClick={() => toast('수정·삭제는 이번 테스트 범위가 아니에요')} />} />
      <div className="dsm-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        <div style={{ aspectRatio: '4 / 3', borderRadius: 16, background: DC.cream, boxShadow: DC.hair, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(55,56,60,.45)' }}><Icon name="image" size={32} /><span style={tx(13, 18, 500, DC.neutral)}>제품 사진</span></div>
        <div style={{ marginTop: 20 }}><DBadge tone="neutral">{p.cat}</DBadge></div>
        <div style={{ ...tx(14, 20, 500, DC.alt), marginTop: 10 }}>{p.brand}</div>
        <h1 style={{ ...tx(22, 30, 700), marginTop: 2 }}>{p.name}</h1>
        {p.reason && <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: DC.card, ...tx(14, 20, 600) }}>먼저 써 보세요 · {p.reason}</div>}
        <div style={{ marginTop: 16 }}>
          {row('사용기한', p.expires ? <>{p.expires} {ddayBadge(p.dday)}</> : ddayBadge(null))}
          {row('개봉일', opened ? opened : <><span style={{ flex: 1 }}>미개봉</span><TextBtn color={DC.ink} onClick={() => { setOpened('2026.11.12'); toast('개봉일을 기록했어요'); }}>오늘 개봉했어요</TextBtn></>)}
          {row('등록일', p.registered)}
          {p.memo && row('메모', p.memo)}
        </div>
        {['영양제', '의약품'].includes(p.cat) && <p style={{ ...tx(13, 19, 500, DC.alt), marginTop: 12 }}>사용기한은 제품에 표기된 정보를 기준으로 해요.</p>}
      </div>
      <ActionArea><DButton label="다씀" onClick={() => onDone(p.id)} /></ActionArea>
    </div>
  );
}

/* 7. 구매 보류 완료 */
function HeldScreen({ params, go, holds }) {
  const p = PRODUCTS[(params && params.item) || 'vitd'];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', textAlign: 'center' }}>
        <Mascot kind="hold" size={180} />
        <h1 style={{ ...tx(24, 32, 700), marginTop: 12 }}>구매를 미뤘어요</h1>
        <p style={{ ...tx(15, 22, 500, DC.alt), marginTop: 6 }}>가지고 있는 제품부터 끝까지 써 봐요.</p>
        <Card style={{ width: '100%', marginTop: 28, padding: 14, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
          <ProdImg size={48} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={tx(13, 18, 500, DC.alt)}>보유 중인 제품</div><div style={{ ...tx(15, 22, 600), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div></div>
          {ddayBadge(p.dday)}
        </Card>
        <Card tone="cream" style={{ width: '100%', marginTop: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={tx(14, 20, 600, DC.neutral)}>이번 달 구매 보류</span><span style={tx(17, 24, 700)}>{holds}회</span>
        </Card>
      </div>
      <ActionArea>
        <DButton label="확인" onClick={() => go('check', null, false, true)} />
        <DButton label="구매 보류 기록 보기" variant="outlined" onClick={() => go('record', { tab: 'hold' })} />
      </ActionArea>
    </div>
  );
}

/* 8. 다씀 기록 */
function RecordScreen({ params, back, holdList, doneList }) {
  const [period, setPeriod] = React.useState('month');
  const [tab, setTab] = React.useState((params && params.tab) || 'hold');
  const month = period === 'month';
  const doneN = month ? doneList.length : 11 + doneList.length;
  const holdN = month ? holdList.length : holdList.length + 5;
  const dist = month ? [['화장품', 2], ['생활용품', 1], ['영양제', 0], ['의약품', 0]] : [['화장품', 8], ['영양제', 3], ['생활용품', 2], ['의약품', 1]];
  const max = Math.max(...dist.map(d => d[1]), 1);
  const seg = (k, l, v, set) => <button key={k} onClick={() => set(k)} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', height: 32, lineHeight: '32px', borderRadius: 8, background: v === k ? '#fff' : 'transparent', boxShadow: v === k ? '0 0 4px rgba(0,0,0,.08)' : 'none', ...tx(14, 32, 600, v === k ? DC.ink : DC.alt) }}>{l}</button>;
  const list = tab === 'hold' ? holdList : doneList;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar title="다씀 기록" onBack={back} />
      <div className="dsm-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 28px' }}>
        <div style={{ display: 'flex', padding: 3, borderRadius: 10, background: 'var(--fill-normal)' }}>{seg('month', '이번 달', period, setPeriod)}{seg('all', '전체', period, setPeriod)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <Card style={{ padding: 16 }}><div style={tx(13, 18, 600, DC.alt)}>다씀</div><div style={{ ...tx(28, 36, 700), marginTop: 4 }}>{doneN}<span style={tx(16, 24, 600, DC.neutral)}>개</span></div></Card>
          <Card style={{ padding: 16 }}><div style={tx(13, 18, 600, DC.alt)}>구매 보류</div><div style={{ ...tx(28, 36, 700), marginTop: 4 }}>{holdN}<span style={tx(16, 24, 600, DC.neutral)}>회</span></div></Card>
        </div>
        <Card tone="cream" style={{ marginTop: 10, padding: 16 }}>
          <div style={{ ...tx(14, 20, 700), marginBottom: 10 }}>카테고리별 다씀</div>
          {dist.map(([c, n]) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 26 }}>
              <span style={{ width: 56, ...tx(13, 18, 500, DC.neutral) }}>{c}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,.7)' }}><div style={{ width: `${(n / max) * 100}%`, height: 8, borderRadius: 4, background: DC.point }}></div></div>
              <span style={{ width: 24, textAlign: 'right', ...tx(13, 18, 600) }}>{n}</span>
            </div>
          ))}
        </Card>
        <div style={{ display: 'flex', gap: 20, marginTop: 24, boxShadow: 'inset 0 -1px 0 var(--line-normal-alternative)' }}>
          {[['hold', '구매 보류'], ['done', '다씀']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ all: 'unset', cursor: 'pointer', padding: '10px 0', boxShadow: tab === k ? 'inset 0 -2px 0 var(--label-normal)' : 'none', ...tx(16, 24, 600, tab === k ? DC.ink : DC.alt) }}>{l}</button>)}
        </div>
        {list.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', boxShadow: 'inset 0 -1px 0 var(--line-normal-alternative)' }}>
            <ProdImg size={44} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ ...tx(15, 22, 600), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</span>{it.isNew && <DBadge tone="mint">방금</DBadge>}</div>
              <div style={tx(13, 18, 500, DC.alt)}>{tab === 'hold' ? `${it.match} 제품 보유 · ${it.date} 보류` : `${it.cat} · ${it.date} 다씀`}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 0. 스플래시 */
function SplashScreen({ go }) {
  React.useEffect(() => { const t = setTimeout(() => go('home', null, false, true), 1800); return () => clearTimeout(t); }, []);
  return (
    <div style={{ height: '100%', background: DC.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
      <Mascot kind="smile" size={180} />
      <div style={{ marginTop: 12, fontFamily: 'var(--font-brand, inherit)', fontSize: 40, lineHeight: '48px', fontWeight: 800, letterSpacing: '-0.04em', color: '#1E8C7E' }}>다씀.</div>
      <p style={{ ...tx(14, 20, 500, DC.alt), marginTop: 8 }}>있는 걸 먼저, 끝까지 다 쓰는 습관</p>
    </div>
  );
}

/* + 다씀 완료 */
function DoneScreen({ params, go, back, total }) {
  const p = PRODUCTS[(params && params.id) || 'vitd'];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', textAlign: 'center' }}>
        <Mascot kind="done" size={220} />
        <h1 style={{ ...tx(24, 32, 700), marginTop: 8 }}>다 쓴 제품으로 기록했어요</h1>
        <p style={{ ...tx(15, 22, 500, DC.alt), marginTop: 6 }}>있는 걸 먼저, 끝까지 다 썼어요.</p>
        <Card style={{ width: '100%', marginTop: 28, padding: 14, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
          <ProdImg size={48} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={tx(13, 18, 500, DC.alt)}>{p.cat} · 2026.11.12 다씀</div><div style={{ ...tx(15, 22, 600), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div></div>
          <DBadge tone="mint">다씀</DBadge>
        </Card>
        <Card tone="cream" style={{ width: '100%', marginTop: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={tx(14, 20, 600, DC.neutral)}>지금까지 다 쓴 제품</span><span style={tx(17, 24, 700)}>{total}개</span>
        </Card>
      </div>
      <ActionArea>
        <DButton label="확인" onClick={back} />
        <DButton label="다씀 기록 보기" variant="outlined" onClick={() => go('record', { tab: 'done' })} />
      </ActionArea>
    </div>
  );
}

/* + 먼저 써야 할 제품 전체 */
function FirstScreen({ go, back, completed = [] }) {
  const list = ['toner', 'multi', 'sun'].filter(k => !completed.includes(k)).map(k => PRODUCTS[k]);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar title="먼저 써야 할 제품" onBack={back} />
      <div className="dsm-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        <p style={tx(14, 20, 500, DC.alt)}>개봉일과 사용기한을 기준으로 먼저 확인할 순서예요.</p>
        {list.length === 0 && <p style={{ ...tx(15, 22, 500, DC.alt), padding: '40px 0', textAlign: 'center' }}>지금 먼저 써야 할 제품이 없어요</p>}
        <div style={{ marginTop: 8 }}>
          {list.map((p, i) => (
            <div key={p.id} className="dsm-press" onClick={() => go('detail', { id: p.id })} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', boxShadow: i < list.length - 1 ? 'inset 0 -1px 0 var(--line-normal-alternative)' : 'none' }}>
              <span style={{ width: 20, textAlign: 'center', flexShrink: 0, ...tx(15, 22, 700, DC.neutral) }}>{i + 1}</span>
              <ProdImg size={60} radius={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...tx(16, 24, 600), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}><DBadge tone="mint">{p.reason}</DBadge><DBadge tone="neutral">{p.cat}</DBadge></div>
              </div>
              <Icon name="chevronRight" size={20} style={{ color: DC.alt, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* + 내 물품 */
function ItemsScreen({ go, completed = [] }) {
  const [cat, setCat] = React.useState('전체');
  const cats = ['전체', '화장품', '영양제', '의약품', '생활용품'];
  const all = ['vitd', 'toner', 'multi', 'sun', 'eye', 'shampoo'].filter(k => !completed.includes(k)).map(k => PRODUCTS[k]).sort((a, b) => (a.dday ?? 1e9) - (b.dday ?? 1e9));
  const list = cat === '전체' ? all : all.filter(p => p.cat === cat);
  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ padding: '16px 20px 0' }}>
        <h1 style={tx(24, 32, 700)}>내 제품 목록</h1>
        <p style={{ ...tx(14, 20, 500, DC.alt), marginTop: 4 }}>보유 제품 {all.length}개 · 사용기한 임박순</p>
      </div>
      <div className="dsm-noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 20px 8px' }}>
        {cats.map(c => { const on = c === cat; const n = c === '전체' ? all.length : all.filter(p => p.cat === c).length; return (
          <button key={c} className="dsm-press" onClick={() => setCat(c)} style={{ all: 'unset', cursor: 'pointer', position: 'relative', flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4, background: on ? DC.mint : '#fff', boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line-normal-neutral)', ...tx(14, 20, on ? 700 : 600, on ? '#171719' : DC.neutral) }}>{c}<span style={tx(13, 18, 600, on ? '#171719' : DC.alt)}>{n}</span></button>
        ); })}
      </div>
      <div style={{ padding: '0 20px' }}>
        {list.length === 0 && <p style={{ ...tx(15, 22, 500, DC.alt), padding: '40px 0', textAlign: 'center' }}>이 카테고리에 등록한 제품이 없어요</p>}
        {list.map((p, i) => (
          <div key={p.id} className="dsm-press" onClick={() => go('detail', { id: p.id })} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', boxShadow: i < list.length - 1 ? 'inset 0 -1px 0 var(--line-normal-alternative)' : 'none' }}>
            <ProdImg size={60} radius={14} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...tx(16, 24, 600), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}><DBadge tone="mint">{p.cat}</DBadge>{ddayBadge(p.dday)}{p.opened ? null : <DBadge tone="neutral">미개봉</DBadge>}</div>
            </div>
            <Icon name="chevronRight" size={20} style={{ color: DC.alt, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { SplashScreen, HomeScreen, ItemsScreen, DoneScreen, FirstScreen, CheckScreen, CameraScreen, AnalyzingScreen, ResultScreen, DetailScreen, HeldScreen, RecordScreen, BottomNav, PRODUCTS, matchQuery, DToast: ToastToast });
