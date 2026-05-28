import { html, LitElement, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { CaptchaConfig, wrapConfig } from './request';
import { safeCustomElement } from './safeCustomElement';
import { sharedStyles } from './view-styles';
import type {
  ApiResponse,
  CaptchaConfigOptions,
  CaptchaInstance,
  CaptchaResponseEnvelope,
  CaptchaRuntimeState,
  CaptchaStyle,
  CaptchaStyleOptions,
  CaptchaType,
  ImageCaptchaVO,
  TianAiCaptchaController
} from './types';
import {
  CAPTCHA_CONTENT_HEIGHT,
  CAPTCHA_WIDTH,
  SLIDER_END,
  clamp,
  createRuntimeState,
  createTrackPayload,
  getBindElement,
  getCaptchaType,
  getLocalPoint,
  getPoint,
  isClickCaptcha,
  isSliderCaptcha,
  normalizeCaptchaResponse,
  nowTrack
} from './utils';
import { wrapStyle } from './style';

export const TAC_ELEMENT_TAG = 'captcha-widget';

type TipState = {
  message: string;
  type: 0 | 1;
  visible: boolean;
};

@safeCustomElement(TAC_ELEMENT_TAG)
export class TianAiCaptchaElement extends LitElement implements CaptchaInstance {
  static styles = sharedStyles;

  @property({ attribute: false })
  config!: CaptchaConfig;

  @property({ attribute: false })
  styleConfig: CaptchaStyle = wrapStyle();

  @property({ attribute: false })
  controller!: TianAiCaptchaController;

  @state()
  private captchaResponse?: ApiResponse<ImageCaptchaVO>;

  @state()
  private loading = false;

  @state()
  private entering = false;

  @state()
  private runtime?: CaptchaRuntimeState;

  @state()
  private tip: TipState = { message: '', type: 0, visible: false };

  @state()
  private clickMarks: Array<{ x: number; y: number; index: number }> = [];

  @query('.content')
  private contentEl!: HTMLElement;

  @query('.click-mask')
  private clickMaskEl!: HTMLElement;

  #moveHandler?: (event: MouseEvent | TouchEvent) => void;
  #upHandler?: (event: MouseEvent | TouchEvent) => void;
  #clickMoveHandler?: (event: MouseEvent) => void;
  #tipTimer: number | undefined;

  get currentType(): CaptchaType {
    return getCaptchaType(this.captchaResponse?.code, this.captchaResponse?.data);
  }

  get type(): CaptchaType {
    return this.currentType;
  }

  get currentCaptchaData(): CaptchaRuntimeState | undefined {
    return this.runtime;
  }

  async reload(): Promise<void> {
    this.loading = true;
    this.entering = false;
    this.clickMarks = [];
    this.#removeDragListeners();
    this.#removeClickMoveListener();
    this.runtime = undefined;
    this.captchaResponse = undefined;
    this.requestUpdate();

    try {
      const response = await this.config.requestCaptchaData(this, this.controller);
      const normalized = normalizeCaptchaResponse(response as CaptchaResponseEnvelope<ImageCaptchaVO>);
      this.captchaResponse = normalized;
      const type = getCaptchaType(normalized.code, normalized.data);
      if (normalized.data) {
        this.runtime = createRuntimeState(normalized.data, type);
      }
    } finally {
      this.loading = false;
      window.setTimeout(() => {
        this.entering = true;
      }, 10);
    }
  }

  destroyCaptcha(): void {
    this.#removeDragListeners();
    this.#removeClickMoveListener();
    if (this.#tipTimer) {
      window.clearTimeout(this.#tipTimer);
    }
  }

  showTips(message: string, type: 0 | 1, callback?: () => void): void {
    this.tip = { message, type, visible: true };
    if (this.#tipTimer) {
      window.clearTimeout(this.#tipTimer);
    }
    this.#tipTimer = window.setTimeout(() => {
      callback?.();
    }, 1000);
  }

  closeTips(callback?: () => void): void {
    this.tip = { ...this.tip, visible: false };
    if (callback) {
      window.setTimeout(callback, 350);
    }
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('captchaResponse') && this.captchaResponse?.data) {
      void this.#hydrateImageSizes();
    }
  }

  render() {
    const bgStyle = this.styleConfig.bgUrl
      ? styleMap({ backgroundImage: `url(${this.styleConfig.bgUrl})` })
      : nothing;

    return html`
      <div class="tac-parent">
        <div class="backdrop" style=${bgStyle}></div>
        <div class="captcha-box">
          ${this.loading ? html`<div class="loading"></div>` : this.#renderCaptcha()}
        </div>
        <div class="bottom">
          ${this.styleConfig.logoUrl === null
            ? nothing
            : html`<img class="logo" src=${this.styleConfig.logoUrl} alt="TAC" />`}
          <button class="icon-btn close-btn" type="button" aria-label="关闭" @click=${this.#handleClose}></button>
          <button class="icon-btn refresh-btn" type="button" aria-label="刷新" @click=${this.#handleRefresh}></button>
        </div>
      </div>
    `;
  }

  #renderCaptcha() {
    const type = this.currentType;
    const classes = {
      captcha: true,
      enter: this.entering,
      slider: type === 'SLIDER',
      rotate: type === 'ROTATE' || type === 'ROTATE_DEGREE',
      concat: type === 'CONCAT',
      click: isClickCaptcha(type),
      disabled: type === 'DISABLED' || type === 'DISABLE'
    };

    return html`
      <section class=${classMap(classes)}>
        ${isSliderCaptcha(type) ? this.#renderSliderCaptcha(type) : nothing}
        ${isClickCaptcha(type) ? this.#renderClickCaptcha() : nothing}
        ${type === 'DISABLED' || type === 'DISABLE' ? this.#renderDisabled() : nothing}
      </section>
    `;
  }

  #renderSliderCaptcha(type: CaptchaType) {
    const captcha = this.captchaResponse?.data;
    const runtime = this.runtime;
    const moveX = runtime?.moveX ?? 0;
    const title =
      type === 'ROTATE' || type === 'ROTATE_DEGREE'
        ? this.styleConfig.i18n.rotate_title
        : type === 'CONCAT'
          ? this.styleConfig.i18n.concat_title
          : this.styleConfig.i18n.slider_title;
    const titleSize =
      type === 'ROTATE' || type === 'ROTATE_DEGREE'
        ? this.styleConfig.i18n.rotate_title_size
        : type === 'CONCAT'
          ? this.styleConfig.i18n.concat_title_size
          : this.styleConfig.i18n.slider_title_size;

    return html`
      <div class="slider-tip">
        <span style=${styleMap({ fontSize: titleSize })}>${title}</span>
      </div>
      <div class="content">
        ${type === 'CONCAT' ? this.#renderConcatImage(captcha) : this.#renderImagePair(type, captcha)}
        ${this.#renderTips()}
      </div>
      ${this.#renderMoveTrack(moveX)}
    `;
  }

  #renderImagePair(type: CaptchaType, captcha?: ImageCaptchaVO) {
    const moveX = this.runtime?.moveX ?? 0;
    const degree = this.runtime ? moveX / (this.runtime.end / 360) : 0;

    return html`
      <div class="bg-img-div">
        <img
          class="bg-img"
          src=${captcha?.backgroundImage ?? ''}
          alt=""
          @load=${this.#handleBackgroundLoad}
        />
      </div>
      ${type === 'ROTATE' || type === 'ROTATE_DEGREE'
        ? html`
            <div class="rotate-img-div">
              <img
                class="template-img rotate-template"
                src=${captcha?.templateImage ?? ''}
                alt=""
                style=${styleMap({ transform: `rotate(${degree}deg)` })}
                @load=${this.#handleTemplateLoad}
              />
            </div>
          `
        : html`
            <div class="slider-img-div" style=${styleMap({ transform: `translate(${moveX}px, 0)` })}>
              <img
                class="template-img"
                src=${captcha?.templateImage ?? ''}
                alt=""
                @load=${this.#handleTemplateLoad}
              />
            </div>
          `}
    `;
  }

  #renderConcatImage(captcha?: ImageCaptchaVO) {
    const randomY = Number(readNestedData(captcha?.data, 'randomY') ?? 0);
    const bgHeight = Number(captcha?.backgroundImageHeight ?? CAPTCHA_CONTENT_HEIGHT);
    const height = bgHeight > 0 ? ((bgHeight - randomY) / bgHeight) * CAPTCHA_CONTENT_HEIGHT : CAPTCHA_CONTENT_HEIGHT;
    const image = captcha?.backgroundImage ? `url(${captcha.backgroundImage})` : '';
    const moveX = this.runtime?.moveX ?? 0;

    return html`
      <div
        class="concat-img-div"
        style=${styleMap({
          backgroundImage: image,
          backgroundPosition: `${moveX}px 0`,
          height: `${height}px`
        })}
      ></div>
      <div
        class="concat-bg-img"
        style=${styleMap({
          backgroundImage: image
        })}
      ></div>
    `;
  }

  #renderMoveTrack(moveX: number) {
    return html`
      <div class="slider-move">
        <div class="slider-move-track">
          <div
            class="track-mask"
            style=${styleMap({
              width: `${moveX}px`,
              borderColor: this.styleConfig.moveTrackMaskBorderColor,
              backgroundColor: this.styleConfig.moveTrackMaskBgColor
            })}
          ></div>
          <div class="slider-move-shadow"></div>
        </div>
        <button
          class="slider-move-btn"
          type="button"
          aria-label="拖动验证"
          style=${styleMap({
            transform: `translate(${moveX}px, 0)`,
            ...(this.styleConfig.btnUrl ? { backgroundImage: `url(${this.styleConfig.btnUrl})` } : {})
          })}
          @mousedown=${this.#handleDown}
          @touchstart=${this.#handleDown}
        ></button>
      </div>
    `;
  }

  #renderClickCaptcha() {
    const captcha = this.captchaResponse?.data;
    return html`
      <div class="click-tip">
        <span style=${styleMap({ fontSize: this.styleConfig.i18n.image_click_title_size })}>
          ${this.styleConfig.i18n.image_click_title}
        </span>
        <img class="tip-img" src=${captcha?.templateImage ?? ''} alt="" @load=${this.#handleTemplateLoad} />
      </div>
      <div class="content">
        <div class="bg-img-div">
          <img class="bg-img" src=${captcha?.backgroundImage ?? ''} alt="" @load=${this.#handleBackgroundLoad} />
          <div class="click-mask" @click=${this.#handleImageClick}>
            ${this.clickMarks.map(
              (mark) => html`
                <span
                  class="click-span"
                  style=${styleMap({
                    left: `${mark.x - 10}px`,
                    top: `${mark.y - 10}px`
                  })}
                  >${mark.index}</span
                >
              `
            )}
          </div>
        </div>
        ${this.#renderTips()}
      </div>
      <button class="click-confirm-btn" type="button" @click=${this.#handleClickConfirm}>
        ${this.styleConfig.i18n.confirm_text}
      </button>
    `;
  }

  #renderDisabled() {
    const response = this.captchaResponse;
    const msg = response?.msg ?? response?.message ?? '接口异常';
    return html`
      <div class="slider-tip">
        <span style=${styleMap({ fontSize: this.styleConfig.i18n.disable_title_size })}>
          ${this.styleConfig.i18n.disable_title}
        </span>
      </div>
      <div class="content">
        <div class="disable-panel">
          <span>${msg}</span>
        </div>
      </div>
    `;
  }

  #renderTips() {
    return html`
      <div
        class=${classMap({
          tips: true,
          success: this.tip.type === 1,
          error: this.tip.type === 0,
          on: this.tip.visible
        })}
      >
        ${this.tip.message}
      </div>
    `;
  }

  #handleBackgroundLoad = (event: Event): void => {
    if (!this.runtime) {
      return;
    }
    const img = event.currentTarget as HTMLImageElement;
    this.runtime = {
      ...this.runtime,
      bgImageWidth: Math.round(img.offsetWidth || CAPTCHA_WIDTH),
      bgImageHeight: Math.round(img.offsetHeight || CAPTCHA_CONTENT_HEIGHT)
    };
  };

  #handleTemplateLoad = (event: Event): void => {
    if (!this.runtime) {
      return;
    }
    const img = event.currentTarget as HTMLImageElement;
    this.runtime = {
      ...this.runtime,
      templateImageWidth: Math.round(img.offsetWidth || img.naturalWidth || 0),
      templateImageHeight: Math.round(img.offsetHeight || img.naturalHeight || 0)
    };
  };

  #handleDown = (event: MouseEvent | TouchEvent): void => {
    if (!this.runtime || !isSliderCaptcha(this.currentType)) {
      return;
    }
    event.preventDefault();
    const point = getPoint(event);
    const startTime = new Date();
    this.runtime = {
      ...this.runtime,
      startX: point.x,
      startY: point.y,
      startTime,
      stopTime: undefined,
      trackList: [nowTrack(startTime, point, 'down')]
    };
    this.#moveHandler = (moveEvent) => this.#handleMove(moveEvent);
    this.#upHandler = (upEvent) => this.#handleUp(upEvent);
    window.addEventListener('mousemove', this.#moveHandler);
    window.addEventListener('mouseup', this.#upHandler);
    window.addEventListener('touchmove', this.#moveHandler, { passive: false });
    window.addEventListener('touchend', this.#upHandler);
  };

  #handleMove(event: MouseEvent | TouchEvent): void {
    if (!this.runtime) {
      return;
    }
    event.preventDefault();
    const touchEvent = 'touches' in event && event.touches.length > 0 ? event.touches[0] : event;
    const point = getPoint(touchEvent as MouseEvent);
    const moveX = clamp(point.x - this.runtime.startX, 0, this.runtime.end);
    const moveY = point.y - this.runtime.startY;
    this.runtime = {
      ...this.runtime,
      moveX,
      moveY,
      trackList: [...this.runtime.trackList, nowTrack(this.runtime.startTime, point, 'move')]
    };
  }

  #handleUp(event: MouseEvent | TouchEvent): void {
    if (!this.runtime) {
      return;
    }
    this.#removeDragListeners();
    const point = getPoint(event);
    const stopTime = new Date();
    this.runtime = {
      ...this.runtime,
      stopTime,
      trackList: [...this.runtime.trackList, nowTrack(this.runtime.startTime, point, 'up')]
    };
    void this.#submit();
  }

  #handleImageClick = (event: MouseEvent): void => {
    if (!this.runtime || !isClickCaptcha(this.currentType)) {
      return;
    }
    if ((event.target as HTMLElement).classList.contains('click-span')) {
      return;
    }
    const point = getLocalPoint(event, this.clickMaskEl);
    const firstClick = this.runtime.clickCount === 0;
    const startTime = firstClick ? new Date() : this.runtime.startTime;
    const clickCount = this.runtime.clickCount + 1;
    if (firstClick) {
      this.#clickMoveHandler = (moveEvent) => this.#handleClickMove(moveEvent);
      window.addEventListener('mousemove', this.#clickMoveHandler);
    }
    this.runtime = {
      ...this.runtime,
      startX: firstClick ? point.x : this.runtime.startX,
      startY: firstClick ? point.y : this.runtime.startY,
      startTime,
      clickCount,
      trackList: [...this.runtime.trackList, nowTrack(startTime, point, 'click')]
    };
    this.clickMarks = [...this.clickMarks, { ...point, index: clickCount }];
  };

  #handleClickMove(event: MouseEvent): void {
    if (!this.runtime || !this.clickMaskEl) {
      return;
    }
    const point = getLocalPoint(event, this.clickMaskEl);
    this.runtime = {
      ...this.runtime,
      trackList: [...this.runtime.trackList, nowTrack(this.runtime.startTime, point, 'move')]
    };
  }

  #handleClickConfirm = (): void => {
    if (!this.runtime || this.runtime.clickCount <= 0) {
      return;
    }
    this.#removeClickMoveListener();
    this.runtime = {
      ...this.runtime,
      stopTime: new Date()
    };
    void this.#submit();
  };

  #handleRefresh = (event: Event): void => {
    if (this.config.btnRefreshFun) {
      this.config.btnRefreshFun(event, this.controller);
      return;
    }
    this.controller.reloadCaptcha();
  };

  #handleClose = (event: Event): void => {
    if (this.config.btnCloseFun) {
      this.config.btnCloseFun(event, this.controller);
      return;
    }
    this.controller.destroyWindow();
  };

  async #submit(): Promise<void> {
    if (!this.runtime) {
      return;
    }
    const payload = createTrackPayload(this.currentType, this.runtime);
    const id = this.runtime.currentCaptchaId;
    try {
      await this.config.validCaptcha(id, payload, this, this.controller);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.showTips(this.styleConfig.i18n.tips_error, 0, () => {
        void this.config.runValidFail(err, this, this.controller);
      });
    }
  }

  async #hydrateImageSizes(): Promise<void> {
    await this.updateComplete;
    if (!this.runtime) {
      return;
    }
    const contentRect = this.contentEl?.getBoundingClientRect();
    this.runtime = {
      ...this.runtime,
      bgImageWidth: Math.round(contentRect?.width || CAPTCHA_WIDTH),
      bgImageHeight: Math.round(contentRect?.height || CAPTCHA_CONTENT_HEIGHT),
      end: SLIDER_END
    };
  }

  #removeDragListeners(): void {
    if (this.#moveHandler) {
      window.removeEventListener('mousemove', this.#moveHandler);
      window.removeEventListener('touchmove', this.#moveHandler);
      this.#moveHandler = undefined;
    }
    if (this.#upHandler) {
      window.removeEventListener('mouseup', this.#upHandler);
      window.removeEventListener('touchend', this.#upHandler);
      this.#upHandler = undefined;
    }
  }

  #removeClickMoveListener(): void {
    if (this.#clickMoveHandler) {
      window.removeEventListener('mousemove', this.#clickMoveHandler);
      this.#clickMoveHandler = undefined;
    }
  }
}

export class TianAiCaptcha implements TianAiCaptchaController {
  readonly config: CaptchaConfig;
  readonly style: CaptchaStyle;

  #bindEl: HTMLElement;
  #element?: TianAiCaptchaElement;

  constructor(config: CaptchaConfig | CaptchaConfigOptions, style?: CaptchaStyleOptions | null) {
    this.config = wrapConfig(config);
    this.style = wrapStyle(style);
    this.#bindEl = getBindElement(this.config.bindEl);
  }

  init(): this {
    this.destroyWindow();
    const element = document.createElement(TAC_ELEMENT_TAG) as TianAiCaptchaElement;
    element.config = this.config;
    element.styleConfig = this.style;
    element.controller = this;
    this.#bindEl.appendChild(element);
    this.#element = element;
    void element.reload();
    return this;
  }

  reloadCaptcha(): void {
    if (!this.#element) {
      this.init();
      return;
    }
    void this.#element.reload();
  }

  destroyWindow(): void {
    this.#element?.destroyCaptcha();
    this.#element?.remove();
    this.#element = undefined;
  }

  get element(): TianAiCaptchaElement | undefined {
    return this.#element;
  }
}

function readNestedData(data: unknown, key: string): unknown {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  const record = data as Record<string, unknown>;
  if (key in record) {
    return record[key];
  }
  if (record.data && typeof record.data === 'object' && key in (record.data as Record<string, unknown>)) {
    return (record.data as Record<string, unknown>)[key];
  }
  return undefined;
}
