# tianai-captcha-lit-sdk

Lit + TypeScript library version of the TianAi Captcha frontend SDK.

```ts
import { TianAiCaptcha } from 'tianai-captcha-lit-sdk';

const tac = new TianAiCaptcha({
  bindEl: '#captcha-box',
  requestCaptchaDataUrl: '/gen',
  validCaptchaUrl: '/check',
  validSuccess: (res, _captcha, tac) => {
    tac.destroyWindow();
    console.log(res);
  },
  validFail: (_res, _captcha, tac) => tac.reloadCaptcha()
}, {
  logoUrl: null
});

tac.init();
```

This package does not attach `initTAC` or `TAC` to `window`. Import the library from the application and let the application bundler package it.
