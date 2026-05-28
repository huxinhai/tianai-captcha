export type CaptchaType =
  | 'SLIDER'
  | 'ROTATE'
  | 'ROTATE_DEGREE'
  | 'CONCAT'
  | 'WORD_IMAGE_CLICK'
  | 'IMAGE_CLICK'
  | 'DISABLED'
  | 'DISABLE'
  | (string & {});

export type TrackType = 'down' | 'move' | 'up' | 'click';

export interface ApiResponse<T = unknown> {
  code?: number;
  data?: T;
  msg?: string;
  message?: string;
  [key: string]: unknown;
}

export interface CaptchaResponseEnvelope<T = ImageCaptchaVO> {
  id?: string;
  code?: number;
  msg?: string;
  message?: string;
  data?: T;
  captcha?: T;
  [key: string]: unknown;
}

export interface ImageCaptchaVO<TData = unknown> {
  id: string;
  type: CaptchaType;
  backgroundImage?: string | null;
  templateImage?: string | null;
  backgroundImageTag?: string | null;
  templateImageTag?: string | null;
  backgroundImageWidth?: number | null;
  backgroundImageHeight?: number | null;
  templateImageWidth?: number | null;
  templateImageHeight?: number | null;
  data?: TData;
  [key: string]: unknown;
}

export interface ImageCaptchaTrackItem {
  x: number;
  y: number;
  t: number;
  type: TrackType;
}

export interface ImageCaptchaTrack<TData = unknown> {
  bgImageWidth: number;
  bgImageHeight: number;
  templateImageWidth?: number;
  templateImageHeight?: number;
  startTime: Date;
  stopTime: Date;
  trackList: ImageCaptchaTrackItem[];
  data?: TData;
}

export interface MatchParam<TData = unknown> {
  id: string;
  data: ImageCaptchaTrack<TData>;
}

export type BindTarget = string | HTMLElement;

export interface RequestParam<TData = unknown> {
  url: string;
  method: string;
  headers: Record<string, string>;
  data: TData;
}

export interface RequestChain {
  preRequest?: (
    type: 'requestCaptchaData' | 'validCaptcha',
    requestParam: RequestParam,
    config: CaptchaConfigLike,
    captcha: CaptchaInstance | undefined,
    tac: TianAiCaptchaController | undefined
  ) => boolean | void;
  postRequest?: (
    type: 'requestCaptchaData' | 'validCaptcha',
    requestParam: RequestParam,
    response: unknown,
    config: CaptchaConfigLike,
    captcha: CaptchaInstance | undefined,
    tac: TianAiCaptchaController | undefined
  ) => boolean | void;
}

export interface CaptchaInstance {
  readonly type: CaptchaType;
  showTips(message: string, type: 0 | 1, callback?: () => void): void;
  closeTips(callback?: () => void): void;
}

export interface TianAiCaptchaController {
  readonly style: CaptchaStyle;
  reloadCaptcha(): void;
  destroyWindow(): void;
}

export interface CaptchaConfigOptions {
  bindEl: BindTarget;
  requestCaptchaDataUrl: string;
  validCaptchaUrl: string;
  requestHeaders?: Record<string, string>;
  timeToTimestamp?: boolean;
  validSuccess?: (res: ApiResponse, captcha: CaptchaInstance, tac: TianAiCaptchaController) => void | Promise<void>;
  validFail?: (res: ApiResponse | Error, captcha: CaptchaInstance, tac: TianAiCaptchaController) => void | Promise<void>;
  btnRefreshFun?: (event: Event, tac: TianAiCaptchaController) => void;
  btnCloseFun?: (event: Event, tac: TianAiCaptchaController) => void;
}

export interface CaptchaConfigLike {
  readonly bindEl: BindTarget;
  readonly requestCaptchaDataUrl: string;
  readonly validCaptchaUrl: string;
  readonly requestHeaders: Record<string, string>;
  readonly timeToTimestamp: boolean;
  addRequestChain(chain: RequestChain): void;
  insertRequestChain(index: number, chain: RequestChain): void;
  removeRequestChain(index: number): void;
  requestCaptchaData(captcha?: CaptchaInstance, tac?: TianAiCaptchaController): Promise<ApiResponse<ImageCaptchaVO>>;
  validCaptcha(
    currentCaptchaId: string,
    data: ImageCaptchaTrack,
    captcha: CaptchaInstance,
    tac: TianAiCaptchaController
  ): Promise<ApiResponse>;
}

export interface CaptchaI18n {
  tips_success: string;
  tips_error: string;
  tips_4001: string;
  slider_title: string;
  concat_title: string;
  image_click_title: string;
  rotate_title: string;
  disable_title: string;
  confirm_text: string;
  slider_title_size: string;
  concat_title_size: string;
  image_click_title_size: string;
  rotate_title_size: string;
  disable_title_size: string;
}

export interface CaptchaStyleOptions {
  btnUrl?: string | null;
  logoUrl?: string | null;
  bgUrl?: string | null;
  moveTrackMaskBgColor?: string;
  moveTrackMaskBorderColor?: string;
  i18n?: Partial<CaptchaI18n>;
}

export interface CaptchaStyle extends Required<Omit<CaptchaStyleOptions, 'i18n'>> {
  i18n: CaptchaI18n;
}

export interface CaptchaRuntimeState<TData = unknown> {
  currentCaptchaId: string;
  bgImageWidth: number;
  bgImageHeight: number;
  templateImageWidth: number;
  templateImageHeight: number;
  startTime: Date;
  stopTime?: Date;
  trackList: ImageCaptchaTrackItem[];
  startX: number;
  startY: number;
  moveX: number;
  moveY: number;
  end: number;
  clickCount: number;
  data?: TData;
}
