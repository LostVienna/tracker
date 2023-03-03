import {
  DefaultOptions,
  Option,
  TrackerConfig,
  reportTrackerData,
} from '../types/core';
import { createHistoryEvnent } from '../utils/pv';

const MouseEventList: string[] = [
  'click',
  'dblclick',
  'contextmenu',
  'mousedown',
  'mouseup',
  'mouseenter',
  'mouseout',
  'mouseover',
];

export default class Tracker {
  public data: Option;
  constructor(option: Option) {
    this.data = { ...this.initDef(), ...option };
    this.installInnerTrack();
  }

  // 初始化默认的option
  private initDef(): DefaultOptions {
    window.history['pushState'] = createHistoryEvnent('pushState');
    window.history['replaceState'] = createHistoryEvnent('replaceState');
    return <DefaultOptions>{
      sdkVersion: TrackerConfig.version,
      hashTracker: false,
      historyTracker: false,
      domTracker: false,
      jsError: false,
    };
  }

  // 事件捕获——路由跳转
  private captureEvents<T>(MouseEventList: string[], target: string, data?: T) {
    MouseEventList.forEach((event) => {
      window.addEventListener(event, () => {
        this.reportTracker({ event, target, data });
      });
    });
  }

  // 向外暴露自定义用户id
  public setUserId<T extends DefaultOptions['uuid']>(uuid: T) {
    this.data.uuid = uuid;
  }

  // 向外暴露设置额外的参数数据
  public setExtra<T extends DefaultOptions['extra']>(extra: T) {
    this.data.extra = extra;
  }

  // 手动上报数据
  public sendTracker<T extends reportTrackerData>(data: T) {
    this.reportTracker(data);
  }

  // 初始化执行上报的数据类型：路由跳转PV、dom事件、js error
  private installInnerTrack() {
    if (this.data.historyTracker) {
      this.captureEvents(['pushState'], 'history-pv', {
        url: window.location.href,
      });
      this.captureEvents(['replaceState'], 'history-pv', {
        url: window.location.href,
      });
      this.captureEvents(['popstate'], 'history-pv', {
        url: window.location.href,
      });
    }

    if (this.data.hashTracker) {
      this.captureEvents(['hashchange'], 'hash-pv');
    }

    if (this.data.domTracker) {
      this.targetKeyReport();
    }

    if (this.data.jsError) {
      this.jsError();
    }
  }

  // 上传数据到后台
  private reportTracker<T>(data: T) {
    const pramas = { ...this.data, ...data };
    const headers = {
      type: 'application/x-www-form-urlencoded',
    };

    const blob = new Blob([JSON.stringify(pramas)], headers);

    // 请求接口，跳转路由不会中断请求
    navigator.sendBeacon(this.data.requestUrl, blob);
  }

  // dom事件数据上传
  private targetKeyReport() {
    MouseEventList.forEach((event) => {
      window.addEventListener(event, (e) => {
        const target = e.target as HTMLElement;
        const targetValue = target.getAttribute('target-key');
        if (targetValue) {
          this.sendTracker({ event, targetKey: targetValue });
        }
      });
    });
  }

  private jsError() {
    this.errorEvent();
    this.promiseReject();
  }

  // js 语法错误监听
  private errorEvent() {
    window.addEventListener('error', (event) => {
      this.sendTracker({
        event: 'error',
        targetKey: 'message',
        message: event.message,
      });
    });
  }

  // promise 错误捕获
  private promiseReject() {
    window.addEventListener('unhandledrejection', (event) => {
      event.promise.catch((error) => {
        this.sendTracker({
          event: 'error',
          targetKey: 'message',
          message: error,
        });
      });
    });
  }
}
