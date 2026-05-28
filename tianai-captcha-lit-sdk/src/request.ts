import { formatTip } from './style';
import type {
  ApiResponse,
  CaptchaConfigLike,
  CaptchaConfigOptions,
  CaptchaInstance,
  TianAiCaptchaController,
  ImageCaptchaTrack,
  ImageCaptchaVO,
  RequestChain,
  RequestParam
} from './types';
import { replaceDates } from './utils';

export class CaptchaConfig implements CaptchaConfigLike {
  readonly bindEl: CaptchaConfigOptions['bindEl'];
  readonly requestCaptchaDataUrl: string;
  readonly validCaptchaUrl: string;
  readonly timeToTimestamp: boolean;

  #requestHeaders: Record<string, string>;
  #validSuccess?: CaptchaConfigOptions['validSuccess'];
  #validFail?: CaptchaConfigOptions['validFail'];
  #btnRefreshFun?: CaptchaConfigOptions['btnRefreshFun'];
  #btnCloseFun?: CaptchaConfigOptions['btnCloseFun'];
  #requestChain: RequestChain[] = [];

  constructor(args: CaptchaConfigOptions) {
    if (!args.bindEl) {
      throw new Error('[TAC] 必须配置 [bindEl] 用于将验证码绑定到该元素上');
    }
    if (!args.requestCaptchaDataUrl) {
      throw new Error('[TAC] 必须配置 [requestCaptchaDataUrl] 请求验证码接口');
    }
    if (!args.validCaptchaUrl) {
      throw new Error('[TAC] 必须配置 [validCaptchaUrl] 验证验证码接口');
    }

    this.bindEl = args.bindEl;
    this.requestCaptchaDataUrl = args.requestCaptchaDataUrl;
    this.validCaptchaUrl = args.validCaptchaUrl;
    this.timeToTimestamp = args.timeToTimestamp ?? false;
    this.#requestHeaders = { ...(args.requestHeaders ?? {}) };
    this.#validSuccess = args.validSuccess;
    this.#validFail = args.validFail;
    this.#btnRefreshFun = args.btnRefreshFun;
    this.#btnCloseFun = args.btnCloseFun;

    this.insertRequestChain(0, {
      preRequest: (_type, requestParam) => {
        if (this.timeToTimestamp) {
          requestParam.data = replaceDates(requestParam.data);
        }
        return true;
      }
    });
  }

  get requestHeaders(): Record<string, string> {
    return { ...this.#requestHeaders };
  }

  get btnRefreshFun(): CaptchaConfigOptions['btnRefreshFun'] {
    return this.#btnRefreshFun;
  }

  get btnCloseFun(): CaptchaConfigOptions['btnCloseFun'] {
    return this.#btnCloseFun;
  }

  addRequestChain(chain: RequestChain): void {
    this.#requestChain.push(chain);
  }

  insertRequestChain(index: number, chain: RequestChain): void {
    this.#requestChain.splice(index, 0, chain);
  }

  removeRequestChain(index: number): void {
    this.#requestChain.splice(index, 1);
  }

  async requestCaptchaData(captcha?: CaptchaInstance, tac?: TianAiCaptchaController): Promise<ApiResponse<ImageCaptchaVO>> {
    const requestParam: RequestParam<Record<string, never>> = {
      headers: this.#createHeaders(),
      data: {},
      method: 'POST',
      url: this.requestCaptchaDataUrl
    };

    this.#preRequest('requestCaptchaData', requestParam, captcha, tac);
    const response = await this.#send(requestParam);
    this.#postRequest('requestCaptchaData', requestParam, response, captcha, tac);
    return response as ApiResponse<ImageCaptchaVO>;
  }

  async validCaptcha(
    currentCaptchaId: string,
    data: ImageCaptchaTrack,
    captcha: CaptchaInstance,
    tac: TianAiCaptchaController
  ): Promise<ApiResponse> {
    const requestParam: RequestParam = {
      headers: this.#createHeaders(),
      data: {
        id: currentCaptchaId,
        data
      },
      method: 'POST',
      url: this.validCaptchaUrl
    };

    this.#preRequest('validCaptcha', requestParam, captcha, tac);
    const response = (await this.#send(requestParam)) as ApiResponse;
    this.#postRequest('validCaptcha', requestParam, response, captcha, tac);

    if (response.code === 200) {
      const useTimes = (data.stopTime.getTime() - data.startTime.getTime()) / 1000;
      captcha.showTips(formatTip(tac.style.i18n.tips_success, useTimes), 1, () => {
        void this.#runValidSuccess(response, captcha, tac);
      });
    } else {
      const tipMsg = response.code && response.code !== 4001 ? tac.style.i18n.tips_4001 : tac.style.i18n.tips_error;
      captcha.showTips(tipMsg, 0, () => {
        void this.#runValidFail(response, captcha, tac);
      });
    }
    return response;
  }

  getValidFailHandler(): NonNullable<CaptchaConfigOptions['validFail']> | undefined {
    return this.#validFail;
  }

  async runValidFail(res: ApiResponse | Error, captcha: CaptchaInstance, tac: TianAiCaptchaController): Promise<void> {
    await this.#runValidFail(res, captcha, tac);
  }

  #createHeaders(): Record<string, string> {
    return {
      ...this.#requestHeaders,
      'Content-Type': this.#requestHeaders['Content-Type'] ?? 'application/json;charset=UTF-8'
    };
  }

  #preRequest(
    type: 'requestCaptchaData' | 'validCaptcha',
    requestParam: RequestParam,
    captcha?: CaptchaInstance,
    tac?: TianAiCaptchaController
  ): void {
    for (const chain of this.#requestChain) {
      if (chain.preRequest?.(type, requestParam, this, captcha, tac) === false) {
        break;
      }
    }
  }

  #postRequest(
    type: 'requestCaptchaData' | 'validCaptcha',
    requestParam: RequestParam,
    response: unknown,
    captcha?: CaptchaInstance,
    tac?: TianAiCaptchaController
  ): void {
    for (const chain of this.#requestChain) {
      if (chain.postRequest?.(type, requestParam, response, this, captcha, tac) === false) {
        break;
      }
    }
  }

  #send(requestParam: RequestParam): Promise<unknown> {
    const headers = requestParam.headers ?? {};
    const method = requestParam.method || 'GET';
    const normalizedMethod = method.toUpperCase();
    const isJson = Object.values(headers).some((value) => value.includes('application/json'));
    let body: BodyInit | undefined;

    if (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD' && requestParam.data !== undefined) {
      body = isJson && typeof requestParam.data !== 'string' ? JSON.stringify(requestParam.data) : (requestParam.data as BodyInit);
    }

    return fetch(requestParam.url, {
      method,
      headers,
      ...(body === undefined ? {} : { body })
    }).then(async (response) => {
      if (response.status >= 200 && response.status <= 500) {
        return parseResponse(response);
      }
      throw new Error(`Request failed with status: ${response.status}`);
    });
  }

  async #runValidSuccess(res: ApiResponse, captcha: CaptchaInstance, tac: TianAiCaptchaController): Promise<void> {
    if (this.#validSuccess) {
      await this.#validSuccess(res, captcha, tac);
      return;
    }
    tac.destroyWindow();
  }

  async #runValidFail(res: ApiResponse | Error, captcha: CaptchaInstance, tac: TianAiCaptchaController): Promise<void> {
    if (this.#validFail) {
      await this.#validFail(res, captcha, tac);
      return;
    }
    tac.reloadCaptcha();
  }
}

export function wrapConfig(config: CaptchaConfig | CaptchaConfigOptions): CaptchaConfig {
  return config instanceof CaptchaConfig ? config : new CaptchaConfig(config);
}

function parseResponse(response: Pick<Response, 'text'>): Promise<unknown> {
  return response.text().then((text) => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  });
}
