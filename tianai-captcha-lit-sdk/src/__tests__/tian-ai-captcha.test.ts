import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TianAiCaptcha } from '../tian-ai-captcha';
import type { ApiResponse, ImageCaptchaVO, MatchParam } from '../types';

const emptyGif =
  'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

type MockRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: BodyInit | null;
  respond: (status: number, body: unknown, contentType?: string) => void;
};

class MockFetchResponse {
  readonly status: number;
  readonly headers: Headers;
  #body: string;

  constructor(status: number, body: unknown, contentType = 'application/json') {
    this.status = status;
    this.headers = new Headers({ 'Content-Type': contentType });
    this.#body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  text(): Promise<string> {
    return Promise.resolve(this.#body);
  }
}

class MockFetch {
  static requests: MockRequest[] = [];

  static fn: typeof fetch = (input, init = {}) => {
    return new Promise((resolve) => {
      MockFetch.requests.push({
        method: init.method ?? 'GET',
        url: String(input),
        headers: headersToRecord(init.headers),
        body: init.body ?? null,
        respond: (status, responseBody, contentType = 'application/json') => {
          resolve(new MockFetchResponse(status, responseBody, contentType) as unknown as Response);
        }
      });
    });
  };
}

describe('TianAiCaptcha Lit library', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="captcha-box"></div>';
    MockFetch.requests = [];
    vi.stubGlobal('fetch', MockFetch.fn);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('initializes as an importable library without window globals', async () => {
    const tac = new TianAiCaptcha({
      bindEl: '#captcha-box',
      requestCaptchaDataUrl: '/gen',
      validCaptchaUrl: '/check'
    });

    tac.init();
    expect(document.querySelector('captcha-widget')).toBeTruthy();
    expect((window as unknown as { initTAC?: unknown }).initTAC).toBeUndefined();

    MockFetch.requests[0].respond(200, successCaptcha('SLIDER'));
    await settle(tac);

    expect(tac.element?.currentType).toBe('SLIDER');
  });

  it('normalizes legacy captcha envelopes that use captcha instead of code/data', async () => {
    const tac = new TianAiCaptcha({
      bindEl: '#captcha-box',
      requestCaptchaDataUrl: '/gen',
      validCaptchaUrl: '/check'
    });

    tac.init();
    MockFetch.requests[0].respond(200, legacyCaptchaEnvelope('SLIDER'));
    await settle(tac);

    expect(tac.element?.currentType).toBe('SLIDER');
    expect(tac.element?.currentCaptchaData?.currentCaptchaId).toBe('legacy-captcha-id');
  });

  it('uses the top-level id when legacy captcha data does not include one', async () => {
    const tac = new TianAiCaptcha({
      bindEl: '#captcha-box',
      requestCaptchaDataUrl: '/gen',
      validCaptchaUrl: '/check'
    });

    tac.init();
    MockFetch.requests[0].respond(200, legacyCaptchaEnvelopeWithoutNestedId('SLIDER'));
    await settle(tac);

    expect(tac.element?.currentType).toBe('SLIDER');
    expect(tac.element?.currentCaptchaData?.currentCaptchaId).toBe('legacy-response-id');
  });

  it('submits slider tracks using the old ImageCaptchaTrack shape', async () => {
    vi.useFakeTimers();
    const validSuccess = vi.fn();
    const tac = new TianAiCaptcha({
      bindEl: '#captcha-box',
      requestCaptchaDataUrl: '/gen',
      validCaptchaUrl: '/check',
      validSuccess
    });

    tac.init();
    MockFetch.requests[0].respond(200, successCaptcha('SLIDER'));
    await settle(tac);

    const root = tac.element!.shadowRoot!;
    const button = root.querySelector<HTMLButtonElement>('.slider-move-btn')!;
    button.dispatchEvent(mouseEvent('mousedown', 10, 10));
    window.dispatchEvent(mouseEvent('mousemove', 130, 10));
    window.dispatchEvent(mouseEvent('mouseup', 130, 10));

    expect(MockFetch.requests[1].url).toBe('/check');
    const body = JSON.parse(String(MockFetch.requests[1].body)) as MatchParam;
    expect(body.id).toBe('captcha-id');
    expect(body.data.bgImageWidth).toBe(300);
    expect(body.data.bgImageHeight).toBe(180);
    expect(body.data.startTime).toBe(new Date(body.data.startTime).toISOString());
    expect(body.data.stopTime).toBe(new Date(body.data.stopTime).toISOString());
    expect(body.data.trackList.map((item) => item.type)).toEqual(['down', 'move', 'up']);
    expect(body.data.trackList[0]).toMatchObject({ x: 10, y: 10, type: 'down' });
    expect(body.data.trackList[2]).toMatchObject({ x: 130, y: 10, type: 'up' });

    MockFetch.requests[1].respond(200, { code: 200, data: { id: 'ok-id' } });
    await Promise.resolve();
    await Promise.resolve();
    await vi.runAllTimersAsync();
    expect(validSuccess).toHaveBeenCalledTimes(1);
  });

  it('omits null captcha data from the validation payload', async () => {
    const tac = new TianAiCaptcha({
      bindEl: '#captcha-box',
      requestCaptchaDataUrl: '/gen',
      validCaptchaUrl: '/check'
    });

    tac.init();
    MockFetch.requests[0].respond(200, successCaptcha('SLIDER', null));
    await settle(tac);

    const root = tac.element!.shadowRoot!;
    const button = root.querySelector<HTMLButtonElement>('.slider-move-btn')!;
    button.dispatchEvent(mouseEvent('mousedown', 10, 10));
    window.dispatchEvent(mouseEvent('mousemove', 130, 10));
    window.dispatchEvent(mouseEvent('mouseup', 130, 10));

    const body = JSON.parse(String(MockFetch.requests[1].body)) as MatchParam;
    expect(body.data).not.toHaveProperty('data');
  });

  it('keeps concat nested data and sends it back during validation', async () => {
    const tac = new TianAiCaptcha({
      bindEl: '#captcha-box',
      requestCaptchaDataUrl: '/gen',
      validCaptchaUrl: '/check'
    });

    tac.init();
    MockFetch.requests[0].respond(200, successCaptcha('CONCAT', { data: { randomY: 56 }, token: 'abc' }));
    await settle(tac);

    const root = tac.element!.shadowRoot!;
    const button = root.querySelector<HTMLButtonElement>('.slider-move-btn')!;
    button.dispatchEvent(mouseEvent('mousedown', 20, 12));
    window.dispatchEvent(mouseEvent('mousemove', 80, 12));
    window.dispatchEvent(mouseEvent('mouseup', 80, 12));

    const body = JSON.parse(String(MockFetch.requests[1].body)) as MatchParam;
    expect(body.data.data).toEqual({ data: { randomY: 56 }, token: 'abc' });
  });

  it('submits click captchas with click tracks', async () => {
    const tac = new TianAiCaptcha({
      bindEl: '#captcha-box',
      requestCaptchaDataUrl: '/gen',
      validCaptchaUrl: '/check'
    });

    tac.init();
    MockFetch.requests[0].respond(200, successCaptcha('WORD_IMAGE_CLICK'));
    await settle(tac);

    const root = tac.element!.shadowRoot!;
    const mask = root.querySelector<HTMLElement>('.click-mask')!;
    Object.defineProperty(mask, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 300, height: 180, right: 300, bottom: 180, x: 0, y: 0, toJSON: () => ({}) })
    });

    mask.dispatchEvent(mouseEvent('click', 42, 65));
    root.querySelector<HTMLButtonElement>('.click-confirm-btn')!.click();

    const body = JSON.parse(String(MockFetch.requests[1].body)) as MatchParam;
    expect(body.data.trackList).toHaveLength(1);
    expect(body.data.trackList[0]).toMatchObject({ x: 42, y: 65, type: 'click' });
  });
});

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
}

function successCaptcha(type: ImageCaptchaVO['type'], data?: unknown): ApiResponse<ImageCaptchaVO> {
  return {
    code: 200,
    data: {
      id: 'captcha-id',
      type,
      backgroundImage: emptyGif,
      templateImage: emptyGif,
      backgroundImageWidth: 300,
      backgroundImageHeight: 180,
      templateImageWidth: 63,
      templateImageHeight: 180,
      data
    }
  };
}

function legacyCaptchaEnvelope(type: ImageCaptchaVO['type'], data?: unknown) {
  return {
    id: 'legacy-response-id',
    captcha: {
      id: 'legacy-captcha-id',
      type,
      backgroundImage: emptyGif,
      templateImage: emptyGif,
      backgroundImageWidth: 300,
      backgroundImageHeight: 180,
      templateImageWidth: 63,
      templateImageHeight: 180,
      data
    }
  };
}

function legacyCaptchaEnvelopeWithoutNestedId(type: ImageCaptchaVO['type'], data?: unknown) {
  return {
    id: 'legacy-response-id',
    captcha: {
      type,
      backgroundImage: emptyGif,
      templateImage: emptyGif,
      backgroundImageWidth: 300,
      backgroundImageHeight: 180,
      templateImageWidth: 63,
      templateImageHeight: 180,
      data
    }
  };
}

function mouseEvent(type: string, x: number, y: number): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y
  });
  Object.defineProperty(event, 'pageX', { value: x });
  Object.defineProperty(event, 'pageY', { value: y });
  return event;
}

async function settle(tac: TianAiCaptcha): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
    await tac.element?.updateComplete;
  }
}
