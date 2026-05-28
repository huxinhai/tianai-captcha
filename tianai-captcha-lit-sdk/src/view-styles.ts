import { css } from 'lit';

export const sharedStyles = css`
  :host {
    display: block;
    width: 318px;
    font-family: Arial, "Microsoft YaHei", sans-serif;
    color: #1f2933;
    box-sizing: border-box;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  .tac-parent {
    box-shadow: 0 0 11px 0 #999999;
    width: 318px;
    height: 318px;
    overflow: hidden;
    position: relative;
    z-index: 997;
    border-radius: 5px;
    padding: 8px;
    background: #fff;
  }

  .backdrop {
    background-color: #fff;
    background-position: top;
    background-size: cover;
    z-index: -1;
    width: 100%;
    height: 100%;
    inset: 0;
    position: absolute;
    border-radius: 6px;
  }

  .captcha-box {
    height: 260px;
    width: 100%;
    position: relative;
    overflow: hidden;
  }

  .loading {
    width: 120px;
    height: 20px;
    -webkit-mask: linear-gradient(90deg, #000 70%, #0000 0) 0 / 20%;
    background: linear-gradient(#f7b645 0 0) 0 / 0% no-repeat #dddddd6b;
    animation: loading 1s infinite steps(6);
    margin: 120px auto;
  }

  @keyframes loading {
    100% {
      background-size: 120%;
    }
  }

  .captcha {
    text-align: left;
    width: 300px;
    height: 260px;
    z-index: 999;
    position: absolute;
    left: 0;
    top: 0;
    transform-style: preserve-3d;
    will-change: transform;
    transition-duration: 0.45s;
    transform: translateX(-300px);
    user-select: none;
  }

  .captcha.enter {
    transform: translateX(0);
  }

  .slider-tip {
    margin-bottom: 5px;
    font-weight: bold;
    font-size: 15px;
    line-height: normal;
    color: #111;
  }

  .content {
    width: 100%;
    height: 180px;
    position: relative;
    overflow: hidden;
  }

  .bg-img-div {
    width: 100%;
    height: 100%;
    position: absolute;
    transform: translate(0, 0);
  }

  .bg-img {
    height: 100%;
    width: 100%;
    border-radius: 5px;
    display: block;
  }

  .slider-img-div {
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(0, 0);
  }

  .template-img {
    height: 100%;
    display: block;
  }

  .rotate-img-div {
    height: 100%;
    text-align: center;
    position: relative;
  }

  .rotate-template {
    height: 100%;
    display: inline-block;
    transform-origin: center center;
  }

  .concat-img-div {
    background-size: 100% 180px;
    position: absolute;
    transform: translate(0, 0);
    z-index: 1;
    width: 100%;
  }

  .concat-bg-img {
    width: 100%;
    height: 100%;
    position: absolute;
    transform: translate(0, 0);
    background-size: 100% 180px;
  }

  .slider-move {
    height: 34px;
    width: 100%;
    margin: 11px 0;
    position: relative;
    line-height: 38px;
    font-size: 14px;
    text-align: center;
    white-space: nowrap;
    color: #88949d;
    user-select: none;
    filter: opacity(0.8);
  }

  .slider-move-track {
    position: relative;
    height: 32px;
    line-height: 32px;
    text-align: center;
    background: #f5f5f5;
    color: #999;
    font-size: 14px;
    border: 1px solid #f5f5f5;
    border-radius: 4px;
    overflow: hidden;
  }

  .track-mask {
    border-width: 1px;
    border-style: solid;
    width: 0;
    height: 32px;
    opacity: 0.5;
    position: absolute;
    top: -1px;
    left: -1px;
    border-radius: 5px;
  }

  .slider-move-shadow {
    animation: shine 2s infinite;
    height: 100%;
    width: 5px;
    background-color: #fff;
    position: absolute;
    top: 0;
    left: 0;
    filter: opacity(0.5);
    box-shadow: 1px 1px 1px #fff;
    border-radius: 50%;
  }

  @keyframes shine {
    from {
      left: 0;
    }
    to {
      left: 289px;
    }
  }

  .slider-move-btn {
    transform: translate(0, 0);
    position: absolute;
    top: -6px;
    left: 0;
    width: 63px;
    height: 45px;
    background-color: #fff;
    background-repeat: no-repeat;
    background-size: contain;
    border-radius: 5px;
    border: 1px solid #d9e2ec;
    cursor: pointer;
    padding: 0;
  }

  .slider-move-btn::before {
    content: "";
    position: absolute;
    inset: 10px 18px;
    border-top: 3px solid #f7b645;
    border-right: 3px solid #f7b645;
    transform: rotate(45deg);
  }

  .click-tip {
    position: relative;
    height: 40px;
    width: 100%;
  }

  .click-tip span {
    display: inline-block;
    height: 40px;
    line-height: 40px;
    position: absolute;
    font-weight: bold;
  }

  .tip-img {
    height: 35px;
    position: absolute;
    right: 15px;
    display: block;
  }

  .click-mask {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    cursor: crosshair;
  }

  .click-span {
    position: absolute;
    border-radius: 50px;
    background-color: #409eff;
    width: 20px;
    height: 20px;
    text-align: center;
    line-height: 20px;
    color: #fff;
    border: 2px solid #fff;
    font-size: 12px;
  }

  .click-confirm-btn {
    width: 100%;
    height: 35px;
    border-radius: 4px;
    border: 0;
    background: linear-gradient(173deg, hsl(38 91% 58%) 0%, hsl(38 89% 72%) 100%);
    font-size: 15px;
    text-align: center;
    line-height: 35px;
    color: #fff;
    margin-top: 3px;
    cursor: pointer;
  }

  .tips {
    height: 25px;
    width: 100%;
    position: absolute;
    bottom: -25px;
    left: 0;
    z-index: 999;
    font-size: 15px;
    line-height: 25px;
    color: #fff;
    text-align: center;
    transition: bottom 0.3s ease-in-out;
  }

  .tips.error {
    background-color: #ff5d39;
  }

  .tips.success {
    background-color: #39c522;
  }

  .tips.on {
    bottom: 0;
  }

  .disable-panel {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: linear-gradient(135deg, #17324d 0%, #1c6b7f 100%);
    border-radius: 5px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 20px;
  }

  .disable-panel span {
    color: #fff;
    text-align: center;
    font-size: 14px;
  }

  .bottom {
    height: 19px;
    width: 100%;
    margin-top: 1px;
  }

  .logo {
    height: 30px;
    float: left;
  }

  .icon-btn {
    width: 20px;
    height: 20px;
    float: right;
    cursor: pointer;
    border: 0;
    background: transparent;
    padding: 0;
    position: relative;
  }

  .close-btn {
    margin-right: 2px;
  }

  .refresh-btn {
    margin-right: 10px;
  }

  .close-btn::before,
  .close-btn::after {
    content: "";
    position: absolute;
    top: 9px;
    left: 4px;
    width: 13px;
    height: 2px;
    background: #66788a;
  }

  .close-btn::before {
    transform: rotate(45deg);
  }

  .close-btn::after {
    transform: rotate(-45deg);
  }

  .refresh-btn::before {
    content: "";
    position: absolute;
    inset: 4px;
    border: 2px solid #66788a;
    border-right-color: transparent;
    border-radius: 50%;
  }

  .refresh-btn::after {
    content: "";
    position: absolute;
    right: 2px;
    top: 3px;
    width: 0;
    height: 0;
    border-left: 5px solid #66788a;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    transform: rotate(35deg);
  }
`;

