// 날짜 입력 필드 (웹) — 프로토타입과 같이 브라우저 기본 <input type="date"> 사용
import { useState } from 'react';
import { C, FONT } from '@/theme/tokens';

export const formatKoDate = (v: string) => (v ? v.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3.') : '');

export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: '100%', height: 48, padding: '0 14px', border: 0, outline: 'none', borderRadius: 12, background: '#fff', boxSizing: 'border-box',
        boxShadow: focus ? `inset 0 0 0 2px ${C.point}` : `inset 0 0 0 1px ${C.lineNeutral}, 0 1px 2px rgba(0,0,0,.03)`,
        fontSize: 16, lineHeight: '24px', fontFamily: FONT[500], letterSpacing: '0.006em', color: value ? C.ink : C.alt, colorScheme: 'light', margin: 0,
      }}
    />
  );
}
