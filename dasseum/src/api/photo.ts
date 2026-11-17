// 업로드 전 사진 줄이기: 휴대폰 원본(1200만~5000만 화소)은 base64로 5MB를 넘기 쉬워 서버가 413을 반환하고
// Wi-Fi 업로드도 느립니다. 긴 변 2048px · JPEG 0.8로 줄여도 유통기한 같은 작은 글자는 AI가 읽을 수 있습니다.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

const MAX_EDGE = 2048;

/** ImagePicker 결과를 서버로 보낼 `data:image/jpeg;base64,...` 문자열로 바꿉니다. */
export async function toUploadDataUri(asset: ImagePickerAsset) {
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    const longEdge = Math.max(asset.width || 0, asset.height || 0);
    if (longEdge > MAX_EDGE) {
      context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ base64: true, compress: 0.8, format: SaveFormat.JPEG });
    if (!saved.base64) throw new Error('empty');
    return `data:image/jpeg;base64,${saved.base64}`;
  } catch {
    // 변환에 실패하면 원본 base64가 있을 때만 그대로 사용 (서버가 5MB 초과는 거절)
    if (asset.base64) {
      const mime = asset.mimeType && /^image\/(jpeg|png|webp)$/.test(asset.mimeType) ? asset.mimeType : 'image/jpeg';
      return `data:${mime};base64,${asset.base64}`;
    }
    throw new Error('사진을 처리하지 못했어요. 다른 사진으로 다시 시도해 주세요.');
  }
}

type Size = { width: number; height: number };
type Rect = Size & { x: number; y: number };

/**
 * 앱 안 카메라로 찍은 사진에서 화면의 촬영 틀 부분만 잘라 업로드용 data URI로 만듭니다.
 * 미리보기는 화면을 꽉 채우도록(cover) 확대되어 보이므로, 같은 비율로 화면 좌표를 사진 좌표로 바꿉니다.
 * 틀에 딱 맞게 자르면 글자 끝이 잘릴 수 있어 사방으로 `margin`(틀 크기 대비 비율)만큼 여유를 둡니다.
 */
export async function cropToFrame(picture: Size & { uri: string }, view: Size, frame: Rect, margin = 0.08) {
  const { width: pw, height: ph } = picture;
  let crop: Rect | null = null;
  if (pw > 0 && ph > 0 && view.width > 0 && view.height > 0) {
    const scale = Math.max(view.width / pw, view.height / ph);
    const offsetX = (pw * scale - view.width) / 2;
    const offsetY = (ph * scale - view.height) / 2;
    const mx = frame.width * margin;
    const my = frame.height * margin;
    const left = Math.max(0, Math.floor((frame.x - mx + offsetX) / scale));
    const top = Math.max(0, Math.floor((frame.y - my + offsetY) / scale));
    const right = Math.min(pw, Math.ceil((frame.x + frame.width + mx + offsetX) / scale));
    const bottom = Math.min(ph, Math.ceil((frame.y + frame.height + my + offsetY) / scale));
    // 계산이 이상하면(사진 방향이 미리보기와 다른 경우 등) 자르지 않고 전체 사진을 씁니다.
    if (right - left >= 64 && bottom - top >= 32) crop = { x: left, y: top, width: right - left, height: bottom - top };
  }
  try {
    const context = ImageManipulator.manipulate(picture.uri);
    let size: Size = { width: pw, height: ph };
    if (crop) {
      context.crop({ originX: crop.x, originY: crop.y, width: crop.width, height: crop.height });
      size = crop;
    }
    if (Math.max(size.width, size.height) > MAX_EDGE) {
      context.resize(size.width >= size.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ base64: true, compress: 0.85, format: SaveFormat.JPEG });
    if (!saved.base64) throw new Error('empty');
    return `data:image/jpeg;base64,${saved.base64}`;
  } catch {
    throw new Error('사진을 처리하지 못했어요. 다시 찍어 주세요.');
  }
}
