import type { HttpResponse } from "@taco_tsinghua/graphnode-sdk";

/**
 * HttpResponse에서 성공 데이터를 추출합니다.
 * 실패 시 에러를 throw합니다.
 *
 * @example
 * const data = unwrapResponse(await api.graph.getSnapshot());
 */
export function unwrapResponse<T>(response: HttpResponse<T>): T {
  if (response.isSuccess) {
    return response.data;
  }
  throw new Error(response.error?.message || "Unknown error");
}

/**
 * HttpResponse에서 성공 데이터를 추출하고 mapper 함수를 적용합니다.
 * 실패 시 에러를 throw합니다.
 *
 * @example
 * const snapshot = unwrapAndMap(await api.graph.getSnapshot(), mapGraphSnapshot);
 */
export function unwrapAndMap<T, U>(
  response: HttpResponse<T>,
  mapper: (data: T) => U,
): U {
  if (response.isSuccess) {
    return mapper(response.data);
  }
  throw new Error(response.error?.message || "Unknown error");
}
