// 추천 사진(외부 URL) 안전 다운로드
// - http/https만, 계정정보 포함 URL 거부
// - 호스트가 내부망·localhost·링크로컬 등으로 해석되면 차단 (리다이렉트마다 다시 검사)
// - 리다이렉트 최대 3회, 전체 10초 타임아웃
// - Content-Type(image/jpeg|png|webp)과 실제 파일 시그니처 모두 확인
// - 본문을 스트리밍으로 읽으며 최대 용량을 넘으면 즉시 중단 (content-length를 믿지 않음)
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blocked.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['64:ff9b::', 96],
]) blocked.addSubnet(network, prefix, 'ipv6');

export class DownloadError extends Error {}

function isBlockedAddress(address) {
  const family = isIP(address);
  if (family === 4) return blocked.check(address, 'ipv4');
  if (family === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped) return blocked.check(mapped[1], 'ipv4');
    return blocked.check(address, 'ipv6');
  }
  return true;
}

async function assertPublicUrl(url) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new DownloadError('사진 주소가 올바르지 않아요.');
  if (url.username || url.password) throw new DownloadError('사진 주소가 올바르지 않아요.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host || /^localhost$/i.test(host) || /\.(localhost|local|internal)$/i.test(host)) {
    throw new DownloadError('내부 주소의 사진은 저장할 수 없어요.');
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true })
    .catch(() => { throw new DownloadError('사진 주소에 연결할 수 없어요.'); });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new DownloadError('내부 주소의 사진은 저장할 수 없어요.');
  }
}

/** 파일 앞부분으로 실제 형식 판별 (확장자·헤더 위조 방지) */
export function sniffImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return undefined;
}

async function readLimited(response, maxBytes, signal) {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new DownloadError(`사진은 ${Math.round(maxBytes / 1024 / 1024)}MB 이하만 저장할 수 있어요.`);
  const reader = response.body?.getReader();
  if (!reader) throw new DownloadError('사진을 내려받지 못했어요.');
  const chunks = [];
  let size = 0;
  for (;;) {
    if (signal.aborted) throw new DownloadError('사진을 내려받는 데 너무 오래 걸려요.');
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new DownloadError(`사진은 ${Math.round(maxBytes / 1024 / 1024)}MB 이하만 저장할 수 있어요.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * @returns {Promise<{ buffer: Buffer, contentType: 'image/jpeg' | 'image/png' | 'image/webp' }>}
 */
export async function downloadImage(rawUrl, { maxBytes, timeoutMs = 10_000, maxRedirects = 3 } = {}) {
  let url;
  try { url = new URL(rawUrl); } catch { throw new DownloadError('사진 주소가 올바르지 않아요.'); }
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      await assertPublicUrl(url);
      const response = await fetch(url, { redirect: 'manual', signal, headers: { Accept: 'image/jpeg,image/png,image/webp' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel().catch(() => {});
        if (!location) throw new DownloadError('사진을 내려받지 못했어요.');
        url = new URL(location, url);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new DownloadError('추천 사진을 내려받지 못했어요. 다른 사진을 골라 주세요.');
      }
      const declaredType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (declaredType && !/^image\/(jpeg|jpg|png|webp)$/.test(declaredType)) {
        await response.body?.cancel().catch(() => {});
        throw new DownloadError('JPEG, PNG, WebP 사진만 저장할 수 있어요.');
      }
      const buffer = await readLimited(response, maxBytes, signal);
      const contentType = sniffImageType(buffer);
      if (!contentType) throw new DownloadError('JPEG, PNG, WebP 사진만 저장할 수 있어요.');
      return { buffer, contentType };
    }
    throw new DownloadError('사진 주소가 너무 여러 번 이동했어요.');
  } catch (error) {
    if (error instanceof DownloadError) throw error;
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new DownloadError('사진을 내려받는 데 너무 오래 걸려요.');
    throw new DownloadError('추천 사진을 내려받지 못했어요. 다른 사진을 골라 주세요.');
  }
}
