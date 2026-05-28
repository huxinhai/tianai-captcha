import type { CaptchaI18n, CaptchaStyle, CaptchaStyleOptions } from './types';

export const DEFAULT_I18N: CaptchaI18n = {
  tips_success: '验证成功,耗时%s秒',
  tips_error: '验证失败，请重新尝试!',
  tips_4001: '验证码被黑洞吸走了！',
  slider_title: '拖动滑块完成拼图',
  concat_title: '拖动滑块完成拼图',
  image_click_title: '请依次点击:',
  rotate_title: '拖动滑块完成拼图',
  disable_title: '验证码暂不可用',
  confirm_text: '确定',
  slider_title_size: '15px',
  concat_title_size: '15px',
  image_click_title_size: '20px',
  rotate_title_size: '15px',
  disable_title_size: '15px'
};

export const DEFAULT_LOGO_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAMAAAAM7l6QAAAAMFBMVEVHcEz3tkX3tkX3tkX3tkX3tkX3tkX3tkX3tkX3tkX3tkX3tkX3tkX3tkX3tkVmTmjZAAAAD3RSTlMASbTm8wh12hOGoCNiyTV98jvOAAABB0lEQVR42nVT0aIFEQiMorD0/397Lc5a7J0n1UylgIniLRKyDcbBDudZH2DYCAabn3PmTrjeUX+7rJGWx0SqVpzReAfTtKU5fgVCNfxWjB69USUDGwoOiauHpZEpSr0tCx8ILb3Dm3WgBbAlifAJk6+Ww6wqEUmpmIorQVZ1JtqKnDMjkb7AgIpO/wMCaQbuBuEtsBUxhuD9daUaZnApiQB8NAKotMwirGGr6mbXpPnHLHDmy6oy3FgP+1j8IBdVklFc01xUJwv3NR0rIeXV5zpzdlruiijzNq/ufOeKWzZLP3160u5P8RjT1M+HHFtx+PwGyOZqT/D8ROOfjOInTLBIHjy/hvwHxkwPu5cCE1QAAAAASUVORK5CYII=';

export const DEFAULT_STYLE: CaptchaStyle = {
  btnUrl: null,
  logoUrl: DEFAULT_LOGO_URL,
  bgUrl: null,
  moveTrackMaskBgColor: '#89d2ff',
  moveTrackMaskBorderColor: '#0298f8',
  i18n: DEFAULT_I18N
};

export function wrapStyle(style?: CaptchaStyleOptions | null): CaptchaStyle {
  return {
    ...DEFAULT_STYLE,
    ...style,
    i18n: {
      ...DEFAULT_I18N,
      ...style?.i18n
    }
  };
}

export function formatTip(template: string, seconds: number): string {
  return template.includes('%s') ? template.replace('%s', String(seconds)) : template;
}

