import { apiRequest, failIf } from '@/api/client';

export type AppUser = { id: string; name: string };

/** 처음 실행: 이름으로 사용자 만들기 (서버가 무작위 ID 발급) */
export async function createUser(name: string) {
  const result = await apiRequest<{ user?: AppUser }>('/api/users', {
    method: 'POST', body: { name }, failMessage: '이름을 등록하지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.user), '이름을 등록하지 못했어요.');
  return result.payload.user as AppUser;
}

export async function renameUser(name: string) {
  const result = await apiRequest<{ user?: AppUser }>('/api/users/me', {
    method: 'PATCH', body: { name }, failMessage: '이름을 바꾸지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.user), '이름을 바꾸지 못했어요.');
  return result.payload.user as AppUser;
}
