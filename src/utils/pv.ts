export function createHistoryEvnent<T extends keyof History>(type: T) {
  const origin = history[type];
  return function (this: any) {
    const res = origin.apply(this, arguments);
    var e = new Event(type); // 创建事件
    window.dispatchEvent(e); // 派发事件
    return res;
  };
}
