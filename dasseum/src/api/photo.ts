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
