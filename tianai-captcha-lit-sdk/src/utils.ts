import type {
  ApiResponse,
  CaptchaRuntimeState,
  CaptchaType,
  CaptchaResponseEnvelope,
  ImageCaptchaTrack,
  ImageCaptchaTrackItem,
  ImageCaptchaVO,
  TrackType
} from './types';

export const CAPTCHA_WIDTH = 300;
export const CAPTCHA_CONTENT_HEIGHT = 180;
export const SLIDER_BUTTON_WIDTH = 63;
export const SLIDER_END = CAPTCHA_WIDTH - SLIDER_BUTTON_WIDTH + 5;

export function getBindElement(bindEl: string | HTMLElement): HTMLElement {
  if (typeof bindEl !== 'string') {
    return bindEl;
  }
  const el = document.querySelector<HTMLElement>(bindEl);
  if (!el) {
    throw new Error(`[TAC] bindEl 未找到: ${bindEl}`);
  }
  return el;
}

export function getPoint(event: PointerEvent | MouseEvent | TouchEvent): { x: number; y: number } {
  if ('pageX' in event && event.pageX !== undefined) {
    return {
      x: Math.round(event.pageX),
      y: Math.round(event.pageY)
    };
  }
  const touchEvent = event as TouchEvent;
  const touch = touchEvent.changedTouches?.[0] ?? touchEvent.targetTouches?.[0];
  return {
    x: Math.round(touch?.pageX ?? 0),
    y: Math.round(touch?.pageY ?? 0)
  };
}

export function getLocalPoint(event: PointerEvent | MouseEvent, target: HTMLElement): { x: number; y: number } {
  const rect = target.getBoundingClientRect();
  return {
    x: Math.round(event.clientX - rect.left),
    y: Math.round(event.clientY - rect.top)
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function nowTrack(startTime: Date, point: { x: number; y: number }, type: TrackType): ImageCaptchaTrackItem {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
    type,
    t: Date.now() - startTime.getTime()
  };
}

export function getCaptchaType(responseCode: number | undefined, captcha?: ImageCaptchaVO): CaptchaType {
  if (responseCode === 200 && captcha?.type) {
    return captcha.type;
  }
  return 'DISABLED';
}

export function normalizeCaptchaResponse(
  response: CaptchaResponseEnvelope<ImageCaptchaVO> | ApiResponse<ImageCaptchaVO>
): ApiResponse<ImageCaptchaVO> {
  const captcha = (response as CaptchaResponseEnvelope<ImageCaptchaVO>).captcha ?? response.data;
  if (captcha) {
    const id = captcha.id ?? (response as CaptchaResponseEnvelope<ImageCaptchaVO>).id;
    return {
      ...response,
      code: response.code ?? 200,
      data: {
        ...captcha,
        ...(id ? { id } : {})
      },
      msg: response.msg ?? response.message ?? ''
    };
  }

  return {
    ...response,
    code: response.code ?? 200
  };
}

export function isSliderCaptcha(type: CaptchaType): boolean {
  return type === 'SLIDER' || type === 'ROTATE' || type === 'ROTATE_DEGREE' || type === 'CONCAT';
}

export function isClickCaptcha(type: CaptchaType): boolean {
  return type === 'WORD_IMAGE_CLICK' || type === 'IMAGE_CLICK';
}

export function createRuntimeState(captcha: ImageCaptchaVO, type: CaptchaType): CaptchaRuntimeState {
  return {
    currentCaptchaId: captcha.id,
    bgImageWidth: CAPTCHA_WIDTH,
    bgImageHeight: CAPTCHA_CONTENT_HEIGHT,
    templateImageWidth: Number(captcha.templateImageWidth ?? 0),
    templateImageHeight: Number(captcha.templateImageHeight ?? 0),
    startTime: new Date(),
    trackList: [],
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0,
    end: type === 'ROTATE' || type === 'ROTATE_DEGREE' ? SLIDER_END : SLIDER_END,
    clickCount: 0,
    data: captcha.data
  };
}

export function createTrackPayload(type: CaptchaType, runtime: CaptchaRuntimeState): ImageCaptchaTrack {
  const bgImageWidth = type === 'ROTATE' || type === 'ROTATE_DEGREE' ? runtime.end : runtime.bgImageWidth;
  const payload: ImageCaptchaTrack = {
    bgImageWidth: Math.round(bgImageWidth),
    bgImageHeight: Math.round(runtime.bgImageHeight),
    templateImageWidth: Math.round(runtime.templateImageWidth),
    templateImageHeight: Math.round(runtime.templateImageHeight),
    startTime: runtime.startTime,
    stopTime: runtime.stopTime ?? new Date(),
    trackList: runtime.trackList.map((track) => ({ ...track }))
  };
  if (runtime.data !== undefined && runtime.data !== null) {
    payload.data = runtime.data;
  }
  return payload;
}

export function replaceDates(value: unknown): unknown {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (Array.isArray(value)) {
    return value.map(replaceDates);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceDates(item)])
    );
  }
  return value;
}
